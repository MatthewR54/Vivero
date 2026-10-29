import { supabase } from './supabaseClient';
import { getTodayString, calculateWeightedAverageCost } from '../utils/calculations';

// ============================================================
// Mapeo de cuentas, movimientos monetarios, conciliaciones y lotes
// ============================================================

export function accountFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    accountType: row.account_type,
    balance: Number(row.current_balance),
    active: row.active
  };
}

export function moneyMovementFromDb(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.accounts?.name ?? '',
    movementType: row.movement_type,
    amount: Number(row.amount),
    concept: row.concept ?? '',
    referenceId: row.reference_id ?? '',
    date: row.movement_date,
    createdAt: row.created_at
  };
}

export function reconciliationFromDb(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.accounts?.name ?? '',
    date: row.reconciliation_date,
    expectedBalance: Number(row.system_expected_balance),
    countedBalance: Number(row.physical_counted_balance),
    difference: Number(row.difference),
    justification: row.justification ?? '',
    status: row.status,
    createdAt: row.created_at
  };
}

export function productionInputFromDb(row) {
  return {
    id: row.id,
    batchId: row.batch_id,
    inputName: row.input_name,
    quantity: Number(row.quantity),
    unit: row.unit ?? 'Unidad',
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    applicationDate: row.application_date,
    notes: row.notes ?? '',
    createdAt: row.created_at
  };
}

export function productionBatchFromDb(row) {
  const inputs = Array.isArray(row.production_inputs)
    ? row.production_inputs.map(productionInputFromDb).sort((a, b) => {
        if (b.applicationDate !== a.applicationDate) {
          return (b.applicationDate || '').localeCompare(a.applicationDate || '');
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      })
    : [];

  return {
    id: row.id,
    batchCode: row.batch_code,
    targetProductId: row.target_product_id,
    species: row.plant_species,
    initialQuantity: Number(row.initial_quantity),
    currentQuantity: Number(row.current_quantity),
    startDate: row.start_date,
    estimatedReadyDate: row.estimated_ready_date,
    actualReadyDate: row.actual_ready_date,
    status: row.status,
    environmentalConditions: row.environmental_conditions ?? '',
    accumulatedCost: Number(row.accumulated_cost),
    inputs
  };
}

// ============================================================
// Consultas
// ============================================================

export async function fetchAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('[Supabase] No se pudieron cargar las cuentas:', error);
    throw new Error(error.message);
  }
  return data.map(accountFromDb);
}

export async function fetchMoneyMovements() {
  const { data, error } = await supabase
    .from('money_movements')
    .select('*, accounts(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar los movimientos de dinero:', error);
    throw new Error(error.message);
  }
  return data.map(moneyMovementFromDb);
}

export async function fetchReconciliations() {
  const { data, error } = await supabase
    .from('reconciliations')
    .select('*, accounts(name)')
    .order('reconciliation_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar las conciliaciones:', error);
    throw new Error(error.message);
  }
  return data.map(reconciliationFromDb);
}

export async function fetchProductionBatches() {
  const { data, error } = await supabase
    .from('production_batches')
    .select('*, production_inputs(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar los lotes de producción:', error);
    throw new Error(error.message);
  }
  return data.map(productionBatchFromDb);
}

// ============================================================
// Mutaciones de Tesorería (RF-101 a RF-104)
// ============================================================

/**
 * RF-102 a RF-104: Registra un arqueo/conciliación en public.reconciliations.
 * Si existe diferencia y adjustAccountBalance === true, registra el movimiento
 * AJUSTE_CONCILIACION en money_movements y actualiza accounts.current_balance
 * para que la cuenta refleje el saldo real verificado (Flujo 4 de ARCHITECTURE.md).
 */
export async function createReconciliation({
  accountId,
  expectedBalance,
  countedBalance,
  justification,
  adjustAccountBalance = true
}) {
  const expected = Number(expectedBalance);
  const counted = Number(countedBalance);
  if (Number.isNaN(counted) || counted < 0) {
    throw new Error('El saldo contado debe ser un número válido mayor o igual a cero');
  }

  const difference = counted - expected;
  const trimmedJustification = (justification ?? '').trim();

  if (difference !== 0 && !trimmedJustification) {
    throw new Error('La justificación es obligatoria cuando existe un descuadre');
  }

  const status = difference === 0 ? 'CUADRADO' : 'DESCUADRE_JUSTIFICADO';
  const today = getTodayString();

  const { data: reconRow, error: reconError } = await supabase
    .from('reconciliations')
    .insert({
      account_id: accountId,
      reconciliation_date: today,
      system_expected_balance: expected,
      physical_counted_balance: counted,
      difference,
      justification: trimmedJustification || (difference === 0 ? 'Arqueo cuadrado sin diferencias' : ''),
      status
    })
    .select('*, accounts(name)')
    .single();

  if (reconError) {
    console.error('[Supabase] Error al registrar la conciliación:', reconError);
    throw new Error(reconError.message);
  }

  if (difference !== 0 && adjustAccountBalance) {
    const { error: accError } = await supabase
      .from('accounts')
      .update({
        current_balance: counted,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (accError) {
      console.error('[Supabase] Error al actualizar el saldo de la cuenta tras conciliación:', accError);
      throw new Error(accError.message);
    }

    const diffType = difference > 0 ? 'Sobrante' : 'Faltante';
    const { error: movError } = await supabase
      .from('money_movements')
      .insert({
        account_id: accountId,
        movement_type: 'AJUSTE_CONCILIACION',
        amount: difference,
        concept: `Ajuste por arqueo (${diffType}): ${trimmedJustification}`.slice(0, 200),
        reference_id: reconRow.id,
        movement_date: today
      });

    if (movError) {
      console.error('[Supabase] Error al registrar el movimiento de ajuste de conciliación:', movError);
      throw new Error(movError.message);
    }
  }

  return reconciliationFromDb(reconRow);
}

/**
 * RF-101: Registra una transferencia interna entre dos cuentas (ej. Efectivo <-> Banco/Nequi).
 * Actualiza los saldos de ambas cuentas e inserta los dos movimientos tipo TRANSFERENCIA.
 */
export async function createAccountTransfer({
  fromAccount,
  toAccount,
  amount,
  concept
}) {
  const transferAmount = Number(amount);
  if (!fromAccount || !toAccount || fromAccount.id === toAccount.id) {
    throw new Error('Selecciona una cuenta de origen y una cuenta de destino diferentes');
  }
  if (Number.isNaN(transferAmount) || transferAmount <= 0) {
    throw new Error('El monto a transferir debe ser mayor a cero');
  }
  if (Number(fromAccount.balance) < transferAmount) {
    throw new Error(`Saldo insuficiente en ${fromAccount.name} (Disponible: $${Number(fromAccount.balance).toLocaleString('es-CO')})`);
  }

  const today = getTodayString();
  const refCode = `TRF-${Date.now().toString().slice(-6)}`;
  const cleanConcept = (concept ?? '').trim() || `Traslado de ${fromAccount.name} a ${toAccount.name}`;

  const newFromBalance = Number(fromAccount.balance) - transferAmount;
  const newToBalance = Number(toAccount.balance) + transferAmount;

  const { error: errFrom } = await supabase
    .from('accounts')
    .update({ current_balance: newFromBalance, updated_at: new Date().toISOString() })
    .eq('id', fromAccount.id);
  if (errFrom) throw new Error(errFrom.message);

  const { error: errTo } = await supabase
    .from('accounts')
    .update({ current_balance: newToBalance, updated_at: new Date().toISOString() })
    .eq('id', toAccount.id);
  if (errTo) throw new Error(errTo.message);

  const { error: errMovs } = await supabase
    .from('money_movements')
    .insert([
      {
        account_id: fromAccount.id,
        movement_type: 'TRANSFERENCIA',
        amount: -transferAmount,
        concept: `${cleanConcept} (Salida hacia ${toAccount.name})`.slice(0, 200),
        reference_id: refCode,
        movement_date: today
      },
      {
        account_id: toAccount.id,
        movement_type: 'TRANSFERENCIA',
        amount: transferAmount,
        concept: `${cleanConcept} (Entrada desde ${fromAccount.name})`.slice(0, 200),
        reference_id: refCode,
        movement_date: today
      }
    ]);
  if (errMovs) throw new Error(errMovs.message);

  return { referenceId: refCode };
}

// ============================================================
// Mutaciones de Producción de Plantas (RF-36 a RF-50)
// ============================================================

/**
 * RF-36 a RF-40 y RF-43: Crea un nuevo lote de cultivo en public.production_batches.
 * Si se indica un costo inicial de semillas/esquejes > 0, crea también su primer
 * registro en public.production_inputs para mantener la trazabilidad de costos.
 */
export async function createProductionBatch({
  batchCode,
  targetProductId,
  species,
  initialQuantity,
  startDate,
  estimatedReadyDate,
  status = 'EN_PRODUCCION',
  environmentalConditions = '',
  initialCost = 0,
  initialInputName = ''
}) {
  const cleanSpecies = (species ?? '').trim();
  if (!cleanSpecies) {
    throw new Error('La especie o nombre de la planta en producción es obligatoria');
  }
  const initQty = Math.floor(Number(initialQuantity));
  if (!initQty || Number.isNaN(initQty) || initQty <= 0) {
    throw new Error('La cantidad inicial de plantas debe ser un número entero mayor a 0');
  }
  if (!estimatedReadyDate) {
    throw new Error('La fecha estimada de disponibilidad para la venta es obligatoria');
  }

  const start = startDate || getTodayString();
  const initCostNum = Math.max(0, Number(initialCost) || 0);

  const { data: batchRow, error: batchErr } = await supabase
    .from('production_batches')
    .insert({
      batch_code: batchCode,
      target_product_id: targetProductId || null,
      plant_species: cleanSpecies,
      initial_quantity: initQty,
      current_quantity: initQty,
      start_date: start,
      estimated_ready_date: estimatedReadyDate,
      status,
      environmental_conditions: (environmentalConditions ?? '').trim(),
      accumulated_cost: initCostNum
    })
    .select('*')
    .single();

  if (batchErr) {
    console.error('[Supabase] Error al crear lote de producción:', batchErr);
    throw new Error(batchErr.message);
  }

  let inputs = [];
  if (initCostNum > 0) {
    const unitCost = Math.round((initCostNum / initQty) * 100) / 100;
    const { data: inpRow, error: inpErr } = await supabase
      .from('production_inputs')
      .insert({
        batch_id: batchRow.id,
        input_name: (initialInputName ?? '').trim() || 'Semillas / Esquejes y sustrato base inicial',
        quantity: initQty,
        unit: 'Plántula/Esqueje',
        unit_cost: unitCost,
        total_cost: initCostNum,
        application_date: start,
        notes: 'Costo base registrado al iniciar el lote'
      })
      .select('*')
      .single();

    if (!inpErr && inpRow) {
      inputs = [inpRow];
    }
  }

  return productionBatchFromDb({ ...batchRow, production_inputs: inputs });
}

/**
 * RF-43 y RF-44: Actualiza el estado biológico, cantidad sobreviviente,
 * fecha estimada o condiciones ambientales/climáticas de un lote.
 */
export async function updateProductionBatch({ id, updates }) {
  const row = {};
  if (updates.species !== undefined) row.plant_species = updates.species.trim();
  if (updates.targetProductId !== undefined) row.target_product_id = updates.targetProductId || null;
  if (updates.currentQuantity !== undefined) row.current_quantity = Math.max(0, Math.floor(Number(updates.currentQuantity)));
  if (updates.estimatedReadyDate !== undefined) row.estimated_ready_date = updates.estimatedReadyDate;
  if (updates.actualReadyDate !== undefined) row.actual_ready_date = updates.actualReadyDate;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.environmentalConditions !== undefined) {
    row.environmental_conditions = updates.environmentalConditions.trim();
  }

  const { data, error } = await supabase
    .from('production_batches')
    .update(row)
    .eq('id', id)
    .select('*, production_inputs(*)')
    .single();

  if (error) {
    console.error('[Supabase] Error al actualizar el lote de producción:', error);
    throw new Error(error.message);
  }

  return productionBatchFromDb(data);
}

/**
 * RF-41, RF-42 y RF-48: Registra un insumo o labor aplicada a un lote de cultivo
 * e incrementa el costo acumulado del lote en public.production_batches.
 */
export async function addProductionInput({
  batch,
  inputName,
  quantity,
  unit = 'Unidad',
  unitCost,
  applicationDate,
  notes = ''
}) {
  if (!batch || !batch.id) {
    throw new Error('Lote de producción no válido');
  }
  const cleanName = (inputName ?? '').trim();
  if (!cleanName) {
    throw new Error('El nombre o descripción del insumo es obligatorio');
  }
  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) {
    throw new Error('La cantidad del insumo debe ser mayor a 0');
  }
  const uCost = Number(unitCost);
  if (Number.isNaN(uCost) || uCost < 0) {
    throw new Error('El costo unitario del insumo no puede ser negativo');
  }

  const totalCost = Math.round(qty * uCost * 100) / 100;
  const appDate = applicationDate || getTodayString();

  const { data: inpRow, error: inpErr } = await supabase
    .from('production_inputs')
    .insert({
      batch_id: batch.id,
      input_name: cleanName,
      quantity: qty,
      unit: (unit ?? 'Unidad').trim() || 'Unidad',
      unit_cost: uCost,
      total_cost: totalCost,
      application_date: appDate,
      notes: (notes ?? '').trim()
    })
    .select('*')
    .single();

  if (inpErr) {
    console.error('[Supabase] Error al registrar insumo de producción:', inpErr);
    throw new Error(inpErr.message);
  }

  const newAccumulated = Number(batch.accumulatedCost || 0) + totalCost;
  const { error: batchErr } = await supabase
    .from('production_batches')
    .update({ accumulated_cost: newAccumulated })
    .eq('id', batch.id);

  if (batchErr) {
    console.error('[Supabase] Error al actualizar costo acumulado del lote:', batchErr);
    throw new Error(batchErr.message);
  }

  return {
    input: productionInputFromDb(inpRow),
    newAccumulatedCost: newAccumulated
  };
}

/**
 * RF-45, RF-46 y RF-47: Finaliza el proceso de producción de un lote,
 * calcula el costo unitario real de producción (accumulatedCost / finalQuantity)
 * e incorpora las plantas disponibles al catálogo de inventario registrando
 * ENTRADA_PRODUCCION en inventory_movements.
 */
export async function closeProductionBatch({
  batch,
  finalQuantity,
  targetMode = 'existing', // 'existing' | 'new'
  targetProduct,
  newProductData,
  salePrice
}) {
  if (!batch || !batch.id) {
    throw new Error('Lote de producción no válido');
  }
  const finalQty = Math.floor(Number(finalQuantity));
  if (!finalQty || Number.isNaN(finalQty) || finalQty <= 0) {
    throw new Error('La cantidad final de plantas disponibles debe ser mayor a 0');
  }

  const totalCost = Number(batch.accumulatedCost) || 0;
  const unitCost = Math.round(totalCost / finalQty);
  const today = getTodayString();
  let finalProductId = null;

  if (targetMode === 'existing') {
    if (!targetProduct || !targetProduct.id) {
      throw new Error('Selecciona el producto del catálogo al que se sumarán las plantas');
    }
    finalProductId = targetProduct.id;
    const prevStock = Number(targetProduct.stock) || 0;
    const resultingStock = prevStock + finalQty;
    const newAvgCost = calculateWeightedAverageCost(prevStock, targetProduct.cost, finalQty, unitCost);
    const updatedPrice = salePrice && Number(salePrice) > 0 ? Number(salePrice) : Number(targetProduct.price);

    const { error: prodErr } = await supabase
      .from('products')
      .update({
        current_stock: resultingStock,
        base_cost: newAvgCost,
        base_price: updatedPrice,
        active: true
      })
      .eq('id', targetProduct.id);

    if (prodErr) {
      console.error('[Supabase] Error al actualizar inventario por cosecha de lote:', prodErr);
      throw new Error(prodErr.message);
    }

    const { error: movErr } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: targetProduct.id,
        movement_type: 'ENTRADA_PRODUCCION',
        quantity: finalQty,
        previous_stock: prevStock,
        resulting_stock: resultingStock,
        reason: `Cosecha de lote ${batch.batchCode} (${batch.species}) — Costo unit.: $${unitCost.toLocaleString('es-CO')}`,
        reference_id: batch.batchCode
      });

    if (movErr) {
      console.error('[Supabase] Error al registrar movimiento ENTRADA_PRODUCCION:', movErr);
      throw new Error(movErr.message);
    }
  } else {
    // Crear nuevo producto de vivero en el catálogo e incorporar las plantas
    const sku = newProductData?.sku;
    const name = (newProductData?.name ?? batch.species ?? '').trim();
    const price = Number(salePrice);
    if (!sku || !name) {
      throw new Error('El nombre y SKU del nuevo producto son obligatorios');
    }
    if (Number.isNaN(price) || price <= 0) {
      throw new Error('El precio de venta del nuevo producto debe ser mayor a 0');
    }

    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'vivero')
      .single();

    if (catErr) {
      throw new Error('No se encontró la categoría "vivero" en la base de datos');
    }

    // Se inserta primero con current_stock = 0 para que el trigger de stock inicial
    // no duplique el registro, y enseguida se registra como ENTRADA_PRODUCCION.
    const { error: createErr } = await supabase
      .from('products')
      .insert({
        id: sku,
        sku,
        name,
        category_id: catData.id,
        origin: 'Producción Vivero',
        current_stock: 0,
        min_stock: Math.max(1, Math.floor(Number(newProductData?.minStock) || 10)),
        base_cost: unitCost,
        base_price: price,
        location: (newProductData?.location ?? '').trim() || 'Zona Vivero • Estante Principal',
        unit: (newProductData?.unit ?? '').trim() || 'Unidad / Maceta',
        description: (newProductData?.description ?? '').trim() || `Planta cultivada en vivero a partir del lote ${batch.batchCode}.`,
        active: true
      });

    if (createErr) {
      console.error('[Supabase] Error al crear nuevo producto desde lote:', createErr);
      throw new Error(createErr.message);
    }

    const { error: stockErr } = await supabase
      .from('products')
      .update({ current_stock: finalQty })
      .eq('id', sku);

    if (stockErr) {
      throw new Error(stockErr.message);
    }

    const { error: movErr } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: sku,
        movement_type: 'ENTRADA_PRODUCCION',
        quantity: finalQty,
        previous_stock: 0,
        resulting_stock: finalQty,
        reason: `Incorporación inicial por cosecha de lote ${batch.batchCode} (${batch.species}) — Costo unit.: $${unitCost.toLocaleString('es-CO')}`,
        reference_id: batch.batchCode
      });

    if (movErr) {
      throw new Error(movErr.message);
    }

    finalProductId = sku;
  }

  const { data: updatedBatchRow, error: batchUpdateErr } = await supabase
    .from('production_batches')
    .update({
      status: 'DISPONIBLE',
      current_quantity: finalQty,
      actual_ready_date: today,
      target_product_id: finalProductId
    })
    .eq('id', batch.id)
    .select('*, production_inputs(*)')
    .single();

  if (batchUpdateErr) {
    console.error('[Supabase] Error al cerrar el lote de producción:', batchUpdateErr);
    throw new Error(batchUpdateErr.message);
  }

  return {
    batch: productionBatchFromDb(updatedBatchRow),
    unitCost,
    finalProductId
  };
}
