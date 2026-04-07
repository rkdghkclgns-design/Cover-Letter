/**
 * EMM Parser v3 — AlMind ZIP + FreeMind XML 지원
 * AlMind EMM = ZIP 아카이브 (map/maps/map1.xml 내부에 m:topic 구조)
 * FreeMind MM = 플레인 XML (<node TEXT="..."> 구조)
 */

const EmmParser = (() => {
  let idCounter = 0;
  function genId() { return `node-${++idCounter}`; }

  /**
   * 파일 바이너리 또는 텍스트를 파싱
   * @param {ArrayBuffer|string} data - 파일 데이터
   * @returns {Promise<{ root: MindMapNode }>}
   */
  async function parse(data) {
    idCounter = 0;

    // ZIP 감지 (PK 시그니처)
    if (isZip(data)) {
      return await parseZipEmm(data);
    }

    // 플레인 XML (FreeMind .mm 등)
    const xmlText = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
    return parseXml(xmlText);
  }

  function isZip(data) {
    if (data instanceof ArrayBuffer) {
      const view = new Uint8Array(data, 0, 4);
      return view[0] === 0x50 && view[1] === 0x4B; // PK
    }
    if (typeof data === 'string') {
      return data.charCodeAt(0) === 0x50 && data.charCodeAt(1) === 0x4B;
    }
    return false;
  }

  /**
   * AlMind ZIP EMM 파싱
   */
  async function parseZipEmm(data) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip 라이브러리가 로드되지 않았습니다.');
    }

    const zip = await JSZip.loadAsync(data);

    // map1.xml 우선, 없으면 mapMaster1.xml
    let xmlFile = zip.file('map/maps/map1.xml') || zip.file('map/maps/mapMaster1.xml');

    // 못 찾으면 xml 파일 전체 검색
    if (!xmlFile) {
      const xmlFiles = Object.keys(zip.files).filter((n) => n.endsWith('.xml') && n.includes('map'));
      if (xmlFiles.length > 0) xmlFile = zip.file(xmlFiles[0]);
    }

    if (!xmlFile) {
      throw new Error('EMM 파일 내부에 맵 XML을 찾을 수 없습니다.');
    }

    const xmlText = await xmlFile.async('string');
    return parseAlMindXml(xmlText);
  }

  /**
   * AlMind 네임스페이스 XML 파싱 (m:topic → m:textBox → m:text → m:char)
   */
  function parseAlMindXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('EMM 내부 XML 파싱 실패');
    }

    // 루트 m:topic 찾기 (첫 번째 topic)
    const allTopics = doc.getElementsByTagName('m:topic');
    if (allTopics.length === 0) {
      // 네임스페이스 없이 시도
      const fallback = doc.getElementsByTagName('topic');
      if (fallback.length === 0) throw new Error('토픽 노드를 찾을 수 없습니다.');
      return { root: parseAlMindNode(fallback[0], 0) };
    }

    return { root: parseAlMindNode(allTopics[0], 0) };
  }

  function parseAlMindNode(el, depth) {
    if (depth > 50) return { id: genId(), text: '(max depth)', children: [] };

    const text = extractAlMindText(el);
    const children = [];

    // m:topicBranch 래퍼 안의 m:topic을 수집
    for (const child of el.children) {
      const tag = child.tagName || child.nodeName;
      if (tag === 'm:topic' || tag === 'topic') {
        children.push(parseAlMindNode(child, depth + 1));
      } else if (tag === 'm:topicBranch' || tag === 'topicBranch') {
        for (const grandchild of child.children) {
          const gtag = grandchild.tagName || grandchild.nodeName;
          if (gtag === 'm:topic' || gtag === 'topic') {
            children.push(parseAlMindNode(grandchild, depth + 1));
          }
        }
      }
    }

    return { id: genId(), text: text || '(제목 없음)', children };
  }

  function extractAlMindText(el) {
    // m:char 텍스트 수집 (m:textBox → m:p → m:text → m:char)
    const chars = el.getElementsByTagName('m:char');
    if (chars.length > 0) {
      // 직계 textBox의 char만 (자식 topic의 char 제외)
      const textBox = findDirectChild(el, 'm:textBox') || findDirectChild(el, 'textBox');
      if (textBox) {
        const directChars = textBox.getElementsByTagName('m:char');
        if (directChars.length > 0) {
          return Array.from(directChars).map((c) => c.textContent).join('');
        }
      }
      // 첫 번째 char 그룹만 사용
      return chars[0].textContent.trim();
    }

    // 네임스페이스 없는 fallback
    const fallbackChars = el.getElementsByTagName('char');
    if (fallbackChars.length > 0) return fallbackChars[0].textContent.trim();

    // TEXT 속성 (FreeMind 호환)
    return el.getAttribute('TEXT') || el.getAttribute('text') || '';
  }

  function findDirectChild(el, tagName) {
    for (const child of el.children) {
      if ((child.tagName || child.nodeName) === tagName) return child;
    }
    return null;
  }

  /**
   * 플레인 XML 파싱 (FreeMind, 기타)
   */
  function parseXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('유효하지 않은 XML 파일 형식입니다.');
    }

    // FreeMind: <map><node TEXT="...">
    const mapNode = doc.querySelector('map > node') || doc.querySelector('node');
    if (mapNode) return { root: parseFreeMindNode(mapNode, 0) };

    // AlMind XML (ZIP 없이 직접)
    const topic = doc.getElementsByTagName('m:topic')[0] || doc.getElementsByTagName('topic')[0];
    if (topic) return { root: parseAlMindNode(topic, 0) };

    throw new Error('지원되는 마인드맵 구조를 찾을 수 없습니다.');
  }

  function parseFreeMindNode(el, depth) {
    if (depth > 50) return { id: genId(), text: '(max depth)', children: [] };

    const text = el.getAttribute('TEXT') || el.getAttribute('text') || '';
    const children = [];

    const childNodes = el.querySelectorAll(':scope > node');
    childNodes.forEach((child) => children.push(parseFreeMindNode(child, depth + 1)));

    // richcontent fallback
    if (!text) {
      const rich = el.querySelector(':scope > richcontent');
      if (rich) {
        const body = rich.querySelector('html body, body');
        if (body) return { id: genId(), text: body.textContent.trim(), children };
      }
    }

    return { id: genId(), text: text || '(제목 없음)', children };
  }

  /**
   * 1레벨 브랜치 추출
   */
  function getBranches(tree) {
    return tree.root.children.map((child) => ({
      id: child.id,
      text: child.text,
      children: child.children,
    }));
  }

  /**
   * 데모 데이터
   */
  function createDemoData() {
    idCounter = 0;
    return {
      root: {
        id: genId(), text: '자기소개서',
        children: [
          { id: genId(), text: '지원동기', children: [
            { id: genId(), text: '해당 분야에 대한 오랜 관심과 열정', children: [] },
            { id: genId(), text: '대학교 관련 전공 수강 및 프로젝트 경험', children: [] },
            { id: genId(), text: '산업의 성장성과 비전에 공감', children: [] },
            { id: genId(), text: '기업의 가치관과 개인 목표의 일치', children: [] },
          ]},
          { id: genId(), text: '몰입 경험', children: [
            { id: genId(), text: '팀 프로젝트에서 핵심 기능 개발 담당', children: [] },
            { id: genId(), text: '2주간 밤낮으로 문제 해결에 집중', children: [] },
            { id: genId(), text: '최종 발표에서 우수상 수상', children: [] },
            { id: genId(), text: '몰입을 통해 배운 끈기와 문제해결력', children: [] },
          ]},
          { id: genId(), text: '역량 개발', children: [
            { id: genId(), text: '관련 기술 독학 6개월 과정', children: [] },
            { id: genId(), text: '온라인 강의 수료 (총 120시간)', children: [] },
            { id: genId(), text: '개인 프로젝트 3건 완수', children: [] },
            { id: genId(), text: '실패에서 배운 교훈과 개선 과정', children: [] },
          ]},
          { id: genId(), text: '핵심 역량', children: [
            { id: genId(), text: '프로그래밍: Python, JavaScript, SQL', children: [] },
            { id: genId(), text: '자격증: 정보처리기사, SQLD', children: [] },
            { id: genId(), text: '포트폴리오: 개인 웹서비스 운영 경험', children: [] },
            { id: genId(), text: '협업: Git 활용 팀 프로젝트 5회', children: [] },
          ]},
          { id: genId(), text: '성격 및 가치관', children: [
            { id: genId(), text: '책임감: 맡은 일은 끝까지 완수', children: [] },
            { id: genId(), text: '소통: 팀 내 의견 조율 경험', children: [] },
            { id: genId(), text: '성장지향: 매일 1시간 자기개발', children: [] },
          ]},
          { id: genId(), text: '입사 후 포부', children: [
            { id: genId(), text: '1년차: 직무 역량 안정화 및 업무 숙달', children: [] },
            { id: genId(), text: '3년차: 팀 내 핵심 인력으로 성장', children: [] },
            { id: genId(), text: '5년차: 프로젝트 리드 역할 수행', children: [] },
          ]},
        ],
      },
    };
  }

  return { parse, getBranches, createDemoData };
})();
