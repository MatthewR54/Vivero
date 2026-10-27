import { supabase } from './supabaseClient';

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
