import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockReadFile = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockDeriveParticipantRole = jest.fn();
const mockGetParticipantRequest = jest.fn();
const mockListParticipantRequests = jest.fn();
const mockGetStatusHistory = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  getSignedUrl: mockGetSignedUrl,
  readFile: mockReadFile,
}));

jest.unstable_mockModule('../../../src/services/marriageSupportService.js', () => ({
  MARRIAGE_STATUS: {},
  SIGNER_ROLE: { BENEFICIARY: 'beneficiary' },
  calculateAndSnapshot: jest.fn(),
  deriveParticipantRole: mockDeriveParticipantRole,
  generatePdfAndStamp: jest.fn(),
  getParticipantRequest: mockGetParticipantRequest,
  listParticipantRequests: mockListParticipantRequests,
  notifyNextSigner: jest.fn(),
  recordSignature: jest.fn(),
  transitionStatus: jest.fn(),
  updateWitnessAssignments: jest.fn(),
  validateWitnessAssignments: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/marriageSupportPdf.js', () => ({
  streamMarriageSupportPdf: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: mockGetStatusHistory,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  downloadParticipantContract,
  getMyParticipantRequest,
  listMyParticipantRequests,
} = await import(
  '../../../src/controllers/marriageSupportParticipantController.js'
);

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const CONTRACT_PATH = `${MEMBER_ID}/marriage-contract/contract.pdf`;

const createRequest = (user = { id: MEMBER_ID, role: 'member' }) => ({
  params: { id: REQUEST_ID },
  user,
});

const createResponse = () => {
  const headers = {};
  const res = {
    headersSent: false,
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn((name, value) => {
      headers[name] = value;
    }),
    headers,
  };
  return res;
};

describe('authenticated marriage contract download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatusHistory.mockResolvedValue([]);
    mockGetSignedUrl.mockReturnValue('/api/documents/file/signed-contract-token');
    mockQuery.mockResolvedValue({
      rows: [{
        id: REQUEST_ID,
        member_id: MEMBER_ID,
        witness_1_id: null,
        witness_2_id: null,
        committee_chair_id: null,
        marriage_contract_url: CONTRACT_PATH,
      }],
    });
  });

  test('does not read the contract for an unrelated member', async () => {
    mockDeriveParticipantRole.mockReturnValueOnce(null);
    const res = createResponse();

    await downloadParticipantContract(
      createRequest({ id: 'unrelated-member', role: 'member' }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  test('streams the contract to an assigned participant without exposing a filesystem path', async () => {
    const fileContents = Buffer.from('contract bytes');
    mockDeriveParticipantRole.mockReturnValueOnce('beneficiary');
    mockReadFile.mockResolvedValueOnce(fileContents);
    const res = createResponse();

    await downloadParticipantContract(createRequest(), res);

    expect(mockReadFile).toHaveBeenCalledWith(CONTRACT_PATH);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Cache-Control']).toBe('private, no-store');
    expect(res.headers['Content-Disposition']).toContain(`marriage-contract-${REQUEST_ID}.pdf`);
    expect(res.send).toHaveBeenCalledWith(fileContents);
  });

  test('allows authorized staff to retrieve the contract', async () => {
    mockDeriveParticipantRole.mockReturnValueOnce(null);
    mockReadFile.mockResolvedValueOnce(Buffer.from('contract bytes'));
    const res = createResponse();

    await downloadParticipantContract(
      createRequest({ id: 'admin-id', role: 'admin' }),
      res
    );

    expect(res.send).toHaveBeenCalledTimes(1);
  });
});

describe('participant marriage document response contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatusHistory.mockResolvedValue([]);
    mockGetSignedUrl.mockReturnValue('/api/documents/file/signed-contract-token');
  });

  test('authorized detail returns a signed contract URL without the raw storage path', async () => {
    mockGetParticipantRequest.mockResolvedValueOnce({
      id: REQUEST_ID,
      participant_role: 'witness_1',
      marriage_contract_url: CONTRACT_PATH,
      pdf_url: `/api/marriage-support/participant/${REQUEST_ID}/pdf`,
    });
    const res = createResponse();

    await getMyParticipantRequest(createRequest(), res);

    expect(mockGetSignedUrl).toHaveBeenCalledWith(CONTRACT_PATH);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        marriage_contract_url: '/api/documents/file/signed-contract-token',
        pdf_url: `/api/marriage-support/participant/${REQUEST_ID}/pdf`,
      }),
    });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain(CONTRACT_PATH);
  });

  test('detail preserves a missing contract as null without signing', async () => {
    mockGetParticipantRequest.mockResolvedValueOnce({
      id: REQUEST_ID,
      participant_role: 'witness_1',
      marriage_contract_url: null,
    });
    const res = createResponse();

    await getMyParticipantRequest(createRequest(), res);

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.marriage_contract_url).toBeNull();
  });

  test('list signs any exposed contract path and does not add a field when it was not selected', async () => {
    mockListParticipantRequests.mockResolvedValueOnce([
      { id: REQUEST_ID, marriage_contract_url: CONTRACT_PATH },
      { id: 'request-without-contract-field' },
    ]);
    const res = createResponse();

    await listMyParticipantRequests(createRequest(), res);

    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData[0].marriage_contract_url).toBe('/api/documents/file/signed-contract-token');
    expect(responseData[1]).not.toHaveProperty('marriage_contract_url');
    expect(JSON.stringify(responseData)).not.toContain(CONTRACT_PATH);
  });

  test('an inaccessible detail remains not found and never signs a path', async () => {
    mockGetParticipantRequest.mockResolvedValueOnce(null);
    const res = createResponse();

    await getMyParticipantRequest(
      createRequest({ id: 'unrelated-member', role: 'member' }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });
});
