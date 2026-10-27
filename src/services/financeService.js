import { supabase } from './supabaseClient';
import { getTodayString } from '../utils/calculations';

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

export function productionBatchFromDb(row) {
  return {
    id: row.id,
    batchCode: row.batch_code,
    targetProductId: row.target_product_id,
    species: row.plant_species,
    initialQuantity: row.initial_quantity,
    currentQuantity: row.current_quantity,
    startDate: row.start_date,
    estimatedReadyDate: row.estimated_ready_date,
    actualReadyDate: row.actual_ready_date,
    status: row.status,
    environmentalConditions: row.environmental_conditions ?? '',
    accumulatedCost: Number(row.accumulated_cost)
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
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar los lotes de producción:', error);
    throw new Error(error.message);
  }
  return data.map(productionBatchFromDb);
}

// ============================================================
// Mutaciones (RF-101 a RF-104)
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
