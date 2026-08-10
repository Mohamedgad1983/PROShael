import { fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import axios from 'axios';
import React from 'react';

import { initiativeDonationReviewService } from '../../../services/initiativeDonationReviewService';
import { API_ORIGIN } from '../../../utils/apiConfig';
import InitiativeReport,{ donationReceiptUrl } from '../InitiativeReport';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
}), { virtual: true });
jest.mock('jspdf', () => jest.fn().mockImplementation(() => ({
  setFontSize: jest.fn(),
  text: jest.fn(),
  save: jest.fn(),
})));
jest.mock('jspdf-autotable', () => jest.fn());
jest.mock('../../../utils/excelExport', () => ({ exportJsonToExcel: jest.fn() }));
jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../services/initiativeDonationReviewService', () => {
  const actual = jest.requireActual('../../../services/initiativeDonationReviewService');
  return {
    ...actual,
    initiativeDonationReviewService: {
      approve: jest.fn(),
      reject: jest.fn(),
    },
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedReviewService = initiativeDonationReviewService as
  jest.Mocked<typeof initiativeDonationReviewService>;

const INITIATIVE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DONATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const donation = (status = 'pending') => ({
  id: DONATION_ID,
  amount: 125,
  payment_method: 'bank_transfer',
  payment_date: '2026-08-10',
  status,
  approved_by: status === 'completed' ? 'admin-id' : null,
  approval_date: status === 'completed' ? '2026-08-10T12:00:00.000Z' : null,
  receipt_document_id: 'receipt-id',
  receipt_url: `${API_ORIGIN}/api/documents/file/payload.signature`,
  receipt_document: {
    id: 'receipt-id',
    receipt_url: `${API_ORIGIN}/api/documents/file/payload.signature`,
  },
  rejection_reason: status === 'rejected'
    ? 'مبلغ الإيصال لا يطابق قيمة المساهمة المسجلة'
    : null,
  rejected_by_id: status === 'rejected' ? 'reviewer-id' : null,
  rejected_at: status === 'rejected' ? '2026-08-10T12:00:00.000Z' : null,
  donor: {
    id: 'member-id',
    full_name: 'عضو الاختبار',
    membership_number: 'M-100',
  },
});

const reportResponse = (currentAmount: number, status = 'pending') => ({
  data: {
    initiative: {
      id: INITIATIVE_ID,
      title_ar: 'مبادرة الاختبار',
      target_amount: 1000,
      current_amount: currentAmount,
      status: 'active',
    },
    donations: [donation(status)],
    stats: {
      totalDonations: 1,
      uniqueDonors: 1,
      approvedAmount: status === 'completed' ? 125 : 0,
      progressPercentage: status === 'completed' ? 12.5 : 0,
    },
  },
});

const nonContributorsResponse = {
  data: {
    nonContributors: [],
    stats: {
      totalActiveMembers: 1,
      totalContributors: 1,
      totalNonContributors: 0,
      contributionRate: '100.00',
    },
  },
};

const renderReport = async ({
  role = 'admin',
  afterActionStatus = 'completed',
  afterActionAmount = 225,
} = {}) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user_data', JSON.stringify({ id: 'admin-id', role }));
  let detailsLoads = 0;

  mockedAxios.get.mockImplementation(async (url) => {
    if (String(url).includes('/details')) {
      detailsLoads += 1;
      return detailsLoads === 1
        ? reportResponse(100, 'pending')
        : reportResponse(afterActionAmount, afterActionStatus);
    }
    if (String(url).includes('/non-contributors')) return nonContributorsResponse;
    throw new Error(`Unexpected URL: ${url}`);
  });

  render(<InitiativeReport />);

  await screen.findByText('عضو الاختبار');
  return { detailsLoads: () => detailsLoads };
};

describe('InitiativeReport donation review cycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockedReviewService.approve.mockResolvedValue({
      success: true,
      message: 'تم اعتماد المساهمة بنجاح',
    });
    mockedReviewService.reject.mockResolvedValue({
      success: true,
      message: 'تم رفض المساهمة وتسجيل السبب',
    });
  });

  test('keeps signed receipt endpoints and refuses legacy raw upload paths', () => {
    expect(donationReceiptUrl({
      ...donation(),
      receipt_url: '/api/documents/file/payload.signature?download=1',
    })).toBe(`${API_ORIGIN}/api/documents/file/payload.signature?download=1`);

    expect(donationReceiptUrl({
      ...donation(),
      receipt_url: 'member-id/receipts/private.jpg',
      receipt_document: null,
    })).toBeNull();

    expect(donationReceiptUrl({
      ...donation(),
      receipt_url: 'https://attacker.example/api/documents/file/payload.signature',
      receipt_document: null,
    })).toBeNull();
  });

  test('approves from a contained confirmation dialog and refetches current_amount and status', async () => {
    const promptSpy = jest.spyOn(window, 'prompt');
    const { detailsLoads } = await renderReport();
    const collectedCard = screen.getByRole('group', { name: 'المبلغ المحصل' });
    expect(within(collectedCard).getByText('100')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'اعتماد مساهمة عضو الاختبار' }));
    const dialog = screen.getByRole('dialog', { name: 'تأكيد اعتماد المساهمة' });
    expect(within(dialog).queryByText(/UUID/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتماد' }));

    await waitFor(() => expect(mockedReviewService.approve).toHaveBeenCalledWith(DONATION_ID));
    await waitFor(() => expect(detailsLoads()).toBe(2));
    await waitFor(() => expect(within(collectedCard).getByText('225')).toBeInTheDocument());
    expect(await screen.findByText('معتمدة')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('تم اعتماد المساهمة بنجاح');
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test('requires a meaningful rejection reason, submits it, and keeps totals unchanged after refetch', async () => {
    const promptSpy = jest.spyOn(window, 'prompt');
    const { detailsLoads } = await renderReport({
      afterActionStatus: 'rejected',
      afterActionAmount: 100,
    });

    fireEvent.click(screen.getByRole('button', { name: 'رفض مساهمة عضو الاختبار' }));
    const dialog = screen.getByRole('dialog', { name: 'رفض المساهمة' });
    const reasonInput = within(dialog).getByLabelText(/سبب الرفض/);
    fireEvent.change(reasonInput, { target: { value: '...............' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الرفض' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('سبب الرفض يجب أن يكون واضحاً');
    expect(mockedReviewService.reject).not.toHaveBeenCalled();

    fireEvent.change(reasonInput, {
      target: { value: '  مبلغ الإيصال   لا يطابق قيمة المساهمة المسجلة  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الرفض' }));

    await waitFor(() => expect(mockedReviewService.reject).toHaveBeenCalledWith(
      DONATION_ID,
      'مبلغ الإيصال لا يطابق قيمة المساهمة المسجلة'
    ));
    await waitFor(() => expect(detailsLoads()).toBe(2));
    expect(await screen.findByText('مرفوضة')).toBeInTheDocument();
    const collectedCard = screen.getByRole('group', { name: 'المبلغ المحصل' });
    expect(within(collectedCard).getByText('100')).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test('does not expose financial review actions to a non-reviewer initiative role', async () => {
    await renderReport({ role: 'operational_manager' });

    expect(screen.queryByRole('button', { name: /اعتماد مساهمة/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /رفض مساهمة/ })).not.toBeInTheDocument();
    expect(screen.getByText('بانتظار المسؤول المالي')).toBeInTheDocument();
  });

  test('surfaces a partial legacy approval audit without counting it as approved', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user_data', JSON.stringify({ id: 'admin-id', role: 'admin' }));
    const partialDonation = {
      ...donation('pending'),
      approved_by: 'legacy-reviewer-without-time',
      approval_date: null,
      review_state: 'inconsistent' as const,
    };
    mockedAxios.get.mockImplementation(async (url) => {
      if (String(url).includes('/details')) {
        return {
          data: {
            ...reportResponse(100, 'pending').data,
            donations: [partialDonation],
            stats: {
              totalDonations: 1,
              uniqueDonors: 1,
              approvedAmount: 0,
              progressPercentage: 0,
            },
          },
        };
      }
      if (String(url).includes('/non-contributors')) return nonContributorsResponse;
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<InitiativeReport />);

    expect(await screen.findByText('سجل مراجعة غير مكتمل')).toBeInTheDocument();
    expect(screen.getByText('تتطلب معالجة إدارية')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /اعتماد مساهمة/ })).not.toBeInTheDocument();
    expect(screen.queryByText('معتمدة')).not.toBeInTheDocument();
  });
});
