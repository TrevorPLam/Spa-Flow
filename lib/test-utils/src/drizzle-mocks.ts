import { vi } from 'vitest';

/**
 * Shared test helpers for mocking Drizzle ORM query builders
 * 
 * Drizzle ORM uses a chained query builder pattern:
 * db.select() → { from } → { where } → result
 * 
 * These helpers ensure mocks properly chain the query builder methods.
 */

/**
 * Creates a mock for db.select() that chains to from() → where() → result
 * 
 * @param result - The resolved value for the where() clause
 * @returns A mock return value for db.select()
 * 
 * @example
 * mockSelect.mockReturnValue(createMockSelect([{ id: 1, name: 'test' }]));
 */
export function createMockSelect<T>(result: T): any {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  };
}

/**
 * Creates a mock for db.update() that chains to set() → where() → result
 * 
 * @param setResult - The resolved value for the set() clause (usually undefined)
 * @param whereResult - The resolved value for the where() clause (usually undefined)
 * @returns A mock return value for db.update()
 * 
 * @example
 * mockUpdate.mockReturnValue(createMockUpdate(undefined, undefined));
 */
export function createMockUpdate(setResult: any = undefined, whereResult: any = undefined): any {
  const mockSet = vi.fn().mockResolvedValue(setResult);
  const mockWhere = vi.fn().mockResolvedValue(whereResult);
  
  return {
    set: mockSet,
    where: mockWhere,
  };
}

/**
 * Creates a mock for db.insert() that chains to values() → returning() → result
 * 
 * @param result - The resolved value for the returning() clause
 * @returns A mock return value for db.insert()
 * 
 * @example
 * mockInsert.mockReturnValue(createMockInsert([{ id: 1, name: 'test' }]));
 */
export function createMockInsert<T>(result: T): any {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  };
}

/**
 * Creates a mock for db.delete() that chains to where() → result
 * 
 * @param result - The resolved value for the where() clause (usually undefined)
 * @returns A mock return value for db.delete()
 * 
 * @example
 * mockDelete.mockReturnValue(createMockDelete(undefined));
 */
export function createMockDelete(result: any = undefined): any {
  return {
    where: vi.fn().mockResolvedValue(result),
  };
}

/**
 * Helper to extract the mock functions from a createMockUpdate result
 * Useful for assertions in tests
 * 
 * @param mockUpdateResult - The result from createMockUpdate
 * @returns Object containing set and where mock functions
 * 
 * @example
 * const mockUpdateResult = createMockUpdate();
 * const { set, where } = extractUpdateMocks(mockUpdateResult);
 * expect(set).toHaveBeenCalledWith({ name: 'updated' });
 */
export function extractUpdateMocks(mockUpdateResult: any) {
  return {
    set: mockUpdateResult.set,
    where: mockUpdateResult.where,
  };
}
