import process from 'node:process';

const baseUrl = `http://127.0.0.1:${process.env.PORT ?? 3001}/api/v1`;

export async function request(path, status, method = 'GET', body) {
  let response;
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(`Нет ответа от ${baseUrl}. Проверьте, что API запущен`, { cause: error });
  }

  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (response.status !== status) {
    const message = data?.message ?? 'Ответ API без сообщения';
    throw new Error(`${method} ${path} вернул HTTP ${response.status}. ${message}`);
  }
  if (status !== 204 && data === undefined) {
    throw new Error(`${method} ${path} вернул некорректный JSON`);
  }
  return data;
}
