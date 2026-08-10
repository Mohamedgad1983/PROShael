import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { isDevelopment: false },
}));

const { getMemberDiyas } = await import('../../../src/controllers/diyasController.js');

const response = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('member diya privacy', () => {
  test('rejects a member reading another member history before database access', async () => {
    const res = response();
    await getMemberDiyas({
      user: { id: 'member-a', role: 'member' },
      params: { memberId: 'member-b' },
      query: {},
    }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'DIYA_MEMBER_ACCESS_FORBIDDEN',
    }));
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('allows a member to read only their own history', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'member-a', full_name: 'عضو' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = response();
    await getMemberDiyas({
      user: { id: 'member-a', role: 'member' },
      params: { memberId: 'member-a' },
      query: {},
    }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
