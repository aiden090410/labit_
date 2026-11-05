
/**
 * LABIT - GAS 백엔드 통신 API
 * 공통 등록 로딩 이벤트 지원
 */
const API = (() => {
  let loadingCount = 0;

  function getGasUrl() {
    const configObj = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : {});
    return configObj.GAS_API_URL || '';
  }

  // 로딩 시작
  function beginLoading(action) {
    loadingCount++;
    window.dispatchEvent(new CustomEvent('labit:loading', {
      detail: {
        active: true,
        count: loadingCount,
        action
      }
    }));
  }

  // 로딩 종료
  function endLoading(action) {
    loadingCount = Math.max(0, loadingCount - 1);
    window.dispatchEvent(new CustomEvent('labit:loading', {
      detail: {
        active: loadingCount > 0,
        count: loadingCount,
        action
      }
    }));
  }

  async function request(action, payload = {}, method = 'POST') {
    const url = getGasUrl().trim();

    if (!url) {
      return {
        success: false,
        code: 400,
        message: 'GAS Web App URL이 설정되지 않았습니다.'
      };
    }

    const sessionToken = localStorage.getItem('labit_session_token');
    const requestData = { ...payload, action };

    if (sessionToken && action !== 'auth/verifyToken') {
      requestData.sessionToken = sessionToken;
    }

    const showLoading = method === 'POST';

    if (showLoading) beginLoading(action);

    try {
      let response;

      if (method === 'GET') {
        const queryParams = new URLSearchParams();

        Object.entries(requestData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.set(key, String(value));
          }
        });

        response = await fetch(
          `${url}?${queryParams.toString()}`,
          { method: 'GET', redirect: 'follow' }
        );
      } else {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(requestData),
          redirect: 'follow'
        });
      }

      const text = await response.text();

      let result;

      try {
        result = JSON.parse(text);
      } catch (_) {
        throw new Error(
          `서버가 JSON이 아닌 응답을 반환했습니다. (HTTP ${response.status})`
        );
      }

      if (!response.ok && result.success !== false) {
        return {
          success: false,
          code: response.status,
          message: `서버 응답 오류 (${response.status})`
        };
      }

      return result;

    } catch (error) {
      console.error('[LABIT API Error]', error);

      return {
        success: false,
        code: 500,
        message: '서버 통신 중 오류가 발생했습니다: ' + error.message
      };

    } finally {
      if (showLoading) endLoading(action);
    }
  }

  return {
    get: (action, params) => request(action, params, 'GET'),
    post: (action, data) => request(action, data, 'POST')
  };
})();

window.API = API;
