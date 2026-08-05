import { getExpenseErrorMessage, parseExpenseApiResponse } from '../expenseApi';

describe('expense API errors', () => {
  test('shows the Arabic API validation message instead of a raw HTTP error', async () => {
    const response = {
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        code: 'MISSING_REQUIRED_FIELDS',
        message_ar: 'يرجى استكمال الحقول المطلوبة: المستفيد'
      })
    };

    await expect(parseExpenseApiResponse(response)).rejects.toMatchObject({
      message: 'يرجى استكمال الحقول المطلوبة: المستفيد',
      status: 400,
      code: 'MISSING_REQUIRED_FIELDS'
    });
  });

  test('hides technical database errors behind a friendly Arabic message', async () => {
    const response = {
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'column approval_notes does not exist' })
    };

    await expect(parseExpenseApiResponse(response)).rejects.toMatchObject({
      message: 'تعذر إكمال العملية حالياً. يرجى المحاولة مرة أخرى.'
    });
  });

  test('maps request timeouts to Arabic', () => {
    expect(getExpenseErrorMessage({ name: 'AbortError' })).toBe(
      'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
    );
  });
});
