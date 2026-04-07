// 한국어 불용어 사전 — SEO 키워드 분석에서 노이즈를 제거하기 위한 목록
// 조사, 어미, 접속사, 대명사, 일반 동사/형용사, 웹 UI 공통 용어 포함

export const KOREAN_STOPWORDS = new Set([
  // 조사
  '이', '가', '을', '를', '은', '는', '의', '에', '에서', '으로', '로',
  '와', '과', '도', '만', '까지', '부터', '에게', '한테', '께', '보다',
  '처럼', '같이', '마다', '밖에', '뿐', '이나', '나', '든지', '이든지',
  '이라', '라', '요', '이요', '이여', '여', '아', '야', '이랑', '랑',

  // 어미 / 접미
  '하다', '되다', '있다', '없다', '같다', '이다', '아니다',
  '하는', '되는', '있는', '없는', '된', '한', '할', '될',
  '했다', '됐다', '있었다', '없었다',

  // 대명사 / 지시어
  '나', '너', '그', '그녀', '우리', '저희', '여러분', '자신',
  '이것', '그것', '저것', '여기', '거기', '저기',
  '무엇', '어디', '언제', '얼마', '누구', '어떤', '어느',

  // 일반 명사 (의미 없는 고빈도)
  '것', '수', '등', '때', '중', '곳', '더', '좀', '잘', '못', '안',
  '위', '아래', '앞', '뒤', '속', '밖', '사이', '이후', '이전',
  '현재', '오늘', '내일', '어제', '모두', '각각', '하나', '둘',
  '그리고', '그러나', '또는', '또한', '하지만', '그래서', '따라서',
  '즉', '및', '단', '혹은',

  // 일반 동사/형용사
  '보다', '주다', '받다', '가다', '오다', '알다', '모르다',
  '나다', '들다', '만들다', '쓰다', '읽다',

  // 수사 / 단위
  '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
  '개', '명', '번', '건', '원', '년', '월', '일', '시', '분', '초',

  // 웹 UI 공통 용어 (SEO 분석에서 노이즈)
  '클릭', '바로가기', '더보기', '닫기', '열기', '로그인', '회원가입',
  '검색', '홈', '메뉴', '목록', '이전', '다음', '페이지', '상단',
  '하단', '좌측', '우측', '전체', '보기', '확인', '취소', '등록',
  '수정', '삭제', '저장', '불러오기', '새로고침', '공유', '복사',
  '링크', '사이트', '서비스', '정보', '내용', '관련', '안내',
  '문의', '고객', '센터', '도움말', '이용약관', '개인정보',
  '처리방침', '사업자', '대표', '주소', '연락처',
]);

export function isStopword(word: string): boolean {
  if (word.length < 2) return true;
  if (KOREAN_STOPWORDS.has(word)) return true;
  // 숫자만으로 이루어진 단어 제외
  if (/^\d+$/.test(word)) return true;
  return false;
}

/**
 * 한국어 텍스트에서 의미있는 키워드를 추출하는 토크나이저
 * 형태소 분석기 없이 정규식 기반으로 동작
 *
 * 전략:
 * 1. 한글 연속 문자열 추출 (2글자 이상)
 * 2. 조사/어미 패턴을 접미에서 제거
 * 3. 불용어 필터링
 * 4. 영문 키워드도 추출 (브랜드명 등)
 */
export function tokenizeKorean(text: string): string[] {
  const tokens: string[] = [];

  // 한글 단어 추출 (2글자 이상 연속 한글)
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];

  // 조사/어미 패턴 제거 (접미)
  const suffixPatterns = [
    /입니다$/, /합니다$/, /됩니다$/, /습니다$/,
    /에서$/, /으로$/, /에게$/, /한테$/, /부터$/, /까지$/, /처럼$/,
    /이다$/, /이고$/, /이며$/, /이라$/,
    /하는$/, /되는$/, /있는$/, /없는$/,
    /에$/, /의$/, /를$/, /을$/, /는$/, /은$/, /가$/, /이$/, /와$/, /과$/,
    /도$/, /만$/, /로$/, /서$/,
  ];

  for (const word of koreanWords) {
    let cleaned = word;
    for (const pattern of suffixPatterns) {
      if (cleaned.length > 2 && pattern.test(cleaned)) {
        const stripped = cleaned.replace(pattern, '');
        if (stripped.length >= 2) {
          cleaned = stripped;
          break; // 한 번만 제거
        }
      }
    }
    if (!isStopword(cleaned)) {
      tokens.push(cleaned);
    }
  }

  // 영문 키워드 추출 (2글자 이상, 소문자 변환)
  const englishWords = text.match(/[a-zA-Z]{2,}/g) || [];
  const englishStopwords = new Set([
    'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for',
    'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but',
    'his', 'by', 'from', 'they', 'we', 'her', 'she', 'or', 'an', 'will',
    'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
    'can', 'no', 'just', 'him', 'how', 'its', 'let', 'say', 'she',
    'was', 'were', 'been', 'has', 'had', 'are', 'is', 'am',
    'div', 'span', 'class', 'src', 'alt', 'href', 'img', 'var', 'function',
    'return', 'null', 'undefined', 'true', 'false', 'new', 'type',
    'https', 'http', 'www', 'com', 'org', 'net', 'html', 'css', 'js',
  ]);

  for (const word of englishWords) {
    const lower = word.toLowerCase();
    if (!englishStopwords.has(lower) && lower.length >= 3) {
      tokens.push(lower);
    }
  }

  return tokens;
}
