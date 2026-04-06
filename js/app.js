/**
 * Cover Letter & Resume Builder v4 — Tab-based Architecture
 */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // === Shared State ===
  let currentTab = 'cover-letter';
  const state = {
    'cover-letter': { tree: null, step: 1, customId: 0 },
    'resume':       { tree: null, step: 1, customId: 0 },
  };

  const progressFill = $('#progress-fill');
  const stepsNav = $('#steps-nav');
  const toast = $('#toast');

  // ========== Toast ==========
  function showToast(msg, dur = 2500) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), dur);
  }

  // ========== Main Tab Switching ==========
  function initMainTabs() {
    const tabs = $$('.main-tab');
    const indicator = $('#tab-indicator');

    function updateIndicator() {
      const active = $(`.main-tab.active`);
      if (active && indicator) {
        indicator.style.left = active.offsetLeft + 'px';
        indicator.style.width = active.offsetWidth + 'px';
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        if (name === currentTab) return;

        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        $$('.tab-content').forEach((c) => c.classList.remove('active'));
        $(`#${name}-content`).classList.add('active');

        currentTab = name;
        syncStepNav();
        updateIndicator();
      });
    });

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
  }

  // ========== Step Navigation (shared) ==========
  function prefix() { return currentTab === 'cover-letter' ? 'cl' : 'rs'; }

  function goToStep(n) {
    const p = prefix();
    const s = state[currentTab];
    const old = s.step;

    $(`#${p}-step-upload`)?.classList.remove('active');
    $(`#${p}-step-upload`)?.classList.add('hidden');
    $(`#${p}-step-mapping`)?.classList.remove('active');
    $(`#${p}-step-mapping`)?.classList.add('hidden');
    $(`#${p}-step-editor`)?.classList.remove('active');
    $(`#${p}-step-editor`)?.classList.add('hidden');

    const stepMap = { 1: 'upload', 2: 'mapping', 3: 'editor' };
    const el = $(`#${p}-step-${stepMap[n]}`);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

    s.step = n;
    syncStepNav();
    if (n !== old) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncStepNav() {
    const s = state[currentTab];
    progressFill.style.width = `${(s.step / 3) * 100}%`;
    stepsNav.querySelectorAll('.nav-step').forEach((btn) => {
      const n = Number(btn.dataset.step);
      btn.classList.toggle('active', n === s.step);
      btn.classList.toggle('done', n < s.step);
    });
  }

  stepsNav.querySelectorAll('.nav-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = Number(btn.dataset.step);
      const s = state[currentTab];
      if (target < s.step) goToStep(target);
    });
  });

  // ========== Shared Helpers ==========
  function renderTree(containerId, tree) {
    const container = $(`#${containerId}`);
    if (!container || !tree) return;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    buildNode(frag, tree.root, 0);
    container.appendChild(frag);
  }

  function buildNode(parent, node, depth) {
    const wrap = document.createElement('div');
    wrap.className = depth === 0 ? 'tree-node tree-root' : 'tree-node';
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.dataset.depth = depth;
    const dot = document.createElement('span');
    dot.className = `tree-dot${depth === 0 ? ' root' : node.children?.length ? ' branch' : ''}`;
    const text = document.createElement('span');
    text.className = 'tree-text';
    text.textContent = node.text;
    item.appendChild(dot);
    item.appendChild(text);
    wrap.appendChild(item);
    if (node.children) {
      for (const c of node.children) buildNode(wrap, c, depth + 1);
    }
    parent.appendChild(wrap);
  }

  function renderMappingRows(listId, tree, sections, suggestFn) {
    const list = $(`#${listId}`);
    if (!list || !tree) return;
    list.innerHTML = '';
    const branches = EmmParser.getBranches(tree);
    for (const branch of branches) {
      const row = document.createElement('div');
      row.className = 'mapping-row';
      const name = document.createElement('span');
      name.className = 'mapping-name';
      name.textContent = branch.text;
      name.title = branch.text;
      const arrow = document.createElement('span');
      arrow.className = 'mapping-arrow';
      arrow.textContent = '\u2192';
      const select = document.createElement('select');
      select.className = 'mapping-select';
      select.dataset.branchId = branch.id;
      for (const sec of sections) {
        const opt = document.createElement('option');
        opt.value = sec.key;
        opt.textContent = sec.label;
        select.appendChild(opt);
      }
      select.value = suggestFn(branch.text);
      row.appendChild(name);
      row.appendChild(arrow);
      row.appendChild(select);
      list.appendChild(row);
    }
  }

  function addCustomSection(inputId, listId, sections, suggestFn) {
    const input = $(`#${inputId}`);
    const name = input.value.trim();
    if (!name) { showToast('섹션명을 입력하세요'); return; }

    state[currentTab].customId++;
    const id = `custom-${state[currentTab].customId}`;
    const list = $(`#${listId}`);

    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.dataset.custom = 'true';
    const nameEl = document.createElement('span');
    nameEl.className = 'mapping-name';
    nameEl.textContent = name;
    const arrow = document.createElement('span');
    arrow.className = 'mapping-arrow';
    arrow.textContent = '\u2192';
    const select = document.createElement('select');
    select.className = 'mapping-select';
    select.dataset.branchId = id;
    select.dataset.customName = name;
    for (const sec of sections) {
      const opt = document.createElement('option');
      opt.value = sec.key;
      opt.textContent = sec.label;
      select.appendChild(opt);
    }
    select.value = suggestFn(name);
    const del = document.createElement('button');
    del.className = 'mapping-del';
    del.textContent = '\u00d7';
    del.addEventListener('click', () => row.remove());
    row.appendChild(nameEl);
    row.appendChild(arrow);
    row.appendChild(select);
    row.appendChild(del);
    list.appendChild(row);
    input.value = '';
    showToast(`"${name}" 섹션 추가됨`);
  }

  function collectMappings(listId, tree) {
    const branches = tree ? EmmParser.getBranches(tree) : [];
    const selects = $$(`#${listId} .mapping-select`);
    const mappings = [];
    selects.forEach((sel) => {
      const customName = sel.dataset.customName;
      if (customName) {
        mappings.push({ branchId: sel.dataset.branchId, branchText: customName, sectionKey: sel.value, children: [] });
      } else {
        const branch = branches.find((b) => b.id === sel.dataset.branchId);
        if (branch) mappings.push({ branchId: branch.id, branchText: branch.text, sectionKey: sel.value, children: branch.children });
      }
    });
    return mappings;
  }

  function setLoading(btn, textEl, loading, label) {
    if (loading) {
      btn.classList.add('btn-loading');
      textEl.textContent = 'AI 생성 중...';
      const sp = document.createElement('span');
      sp.className = 'btn-spinner';
      btn.prepend(sp);
    } else {
      btn.classList.remove('btn-loading');
      const sp = btn.querySelector('.btn-spinner');
      if (sp) sp.remove();
      textEl.textContent = label;
    }
  }

  function setupEditor(ctx) {
    const container = $(`#${ctx}-editor-container`);
    const editor = $(`#${ctx}-md-editor`);
    const preview = $(`#${ctx}-md-preview`);

    function render() {
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        preview.innerHTML = DOMPurify.sanitize(marked.parse(editor.value));
      }
    }

    function setMode(mode) {
      container.dataset.mode = mode;
      $$(`[data-ctx="${ctx}"].tab`).forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
      if (mode !== 'edit') render();
      if (mode === 'edit' || mode === 'split') editor.focus();
    }

    $$(`[data-ctx="${ctx}"].tab`).forEach((t) => {
      t.addEventListener('click', () => setMode(t.dataset.mode));
    });

    let debounce = null;
    editor.addEventListener('input', () => {
      if (container.dataset.mode === 'split') {
        clearTimeout(debounce);
        debounce = setTimeout(render, 250);
      }
    });

    return { render, setMode };
  }

  function downloadFile(content, filename, mime) {
    const sanitize = (s) => s.replace(/[/\\:*?"<>|]/g, '_');
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = sanitize(filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 200);
    showToast(`${filename} 다운로드 완료`);
  }

  function handleUpload(dropId, inputId, infoId, nameId, removeId, demoId, onParsed) {
    const drop = $(`#${dropId}`);
    const input = $(`#${inputId}`);
    const info = $(`#${infoId}`);
    const nameEl = $(`#${nameId}`);

    drop.addEventListener('click', () => input.click());
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if (e.target.files[0]) parseFile(e.target.files[0]); });

    $(`#${removeId}`).addEventListener('click', () => {
      state[currentTab].tree = null;
      input.value = '';
      info.classList.add('hidden');
      drop.style.display = '';
    });

    $(`#${demoId}`).addEventListener('click', () => {
      const tree = EmmParser.createDemoData();
      state[currentTab].tree = tree;
      nameEl.textContent = 'demo-data.emm';
      info.classList.remove('hidden');
      drop.style.display = 'none';
      showToast('데모 데이터 로드 완료');
      onParsed(tree);
    });

    function parseFile(file) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.emm', '.mm', '.xml'].includes(ext)) { showToast('지원하지 않는 파일 형식입니다'); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const tree = EmmParser.parse(e.target.result);
          state[currentTab].tree = tree;
          nameEl.textContent = file.name;
          info.classList.remove('hidden');
          drop.style.display = 'none';
          showToast('파일 파싱 완료');
          onParsed(tree);
        } catch (err) { showToast('파싱 실패: ' + err.message); }
      };
      reader.readAsText(file, 'UTF-8');
    }
  }

  // ====================================
  // ===== COVER LETTER TAB =====
  // ====================================
  const clEditor = setupEditor('cl');

  handleUpload('cl-drop-zone', 'cl-file-input', 'cl-file-info', 'cl-file-name', 'cl-remove-file', 'cl-load-demo', (tree) => {
    renderTree('cl-tree-view', tree);
    renderMappingRows('cl-mapping-list', tree, Generator.SECTIONS, Generator.suggestSection);
    goToStep(2);
  });

  $('#cl-btn-add-section').addEventListener('click', () => addCustomSection('cl-custom-section-input', 'cl-mapping-list', Generator.SECTIONS, Generator.suggestSection));
  $('#cl-custom-section-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustomSection('cl-custom-section-input', 'cl-mapping-list', Generator.SECTIONS, Generator.suggestSection); });

  $('#cl-btn-back').addEventListener('click', () => goToStep(1));
  $('#cl-btn-back-mapping').addEventListener('click', () => goToStep(2));

  async function clGenerate() {
    const mappings = collectMappings('cl-mapping-list', state['cover-letter'].tree);
    const params = {
      mappings,
      company: $('#cl-company').value.trim(),
      position: $('#cl-position').value.trim(),
      rootText: state['cover-letter'].tree?.root.text || '',
    };

    const btn = $('#cl-btn-generate');
    const txt = $('#cl-btn-gen-text');
    setLoading(btn, txt, true, '');

    try {
      const md = await Gemini.generateCoverLetter(params);
      $('#cl-md-editor').value = md;
      clEditor.render();
      clEditor.setMode('preview');
      goToStep(3);
      showToast('AI 자기소개서 생성 완료');
    } catch {
      showToast('AI 실패, 템플릿 전환', 3000);
      $('#cl-md-editor').value = Generator.generate(params);
      clEditor.render();
      clEditor.setMode('preview');
      goToStep(3);
    } finally {
      setLoading(btn, txt, false, 'AI 자기소개서 생성');
    }
  }

  $('#cl-btn-generate').addEventListener('click', () => clGenerate().catch(() => showToast('오류 발생')));
  $('#cl-btn-regenerate').addEventListener('click', () => clGenerate().catch(() => showToast('오류 발생')));

  $('#cl-btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText($('#cl-md-editor').value).then(() => showToast('복사됨')).catch(() => showToast('복사 실패'));
  });
  $('#cl-btn-download').addEventListener('click', () => {
    const c = $('#cl-company').value.trim();
    const p = $('#cl-position').value.trim();
    let name = '자기소개서';
    if (c) name += `_${c}`;
    if (p) name += `_${p}`;
    downloadFile($('#cl-md-editor').value, name + '.md', 'text/markdown;charset=utf-8');
  });

  // ====================================
  // ======= RESUME TAB =======
  // ====================================
  const rsEditor = setupEditor('rs');
  let rsLayout = 'classic';
  let rsHTMLContent = '';

  handleUpload('rs-drop-zone', 'rs-file-input', 'rs-file-info', 'rs-file-name', 'rs-remove-file', 'rs-load-demo', (tree) => {
    renderTree('rs-tree-view', tree);
    renderMappingRows('rs-mapping-list', tree, ResumeGenerator.SECTIONS, ResumeGenerator.suggestSection);
    goToStep(2);
  });

  $('#rs-btn-add-section').addEventListener('click', () => addCustomSection('rs-custom-section-input', 'rs-mapping-list', ResumeGenerator.SECTIONS, ResumeGenerator.suggestSection));
  $('#rs-custom-section-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustomSection('rs-custom-section-input', 'rs-mapping-list', ResumeGenerator.SECTIONS, ResumeGenerator.suggestSection); });

  $('#rs-btn-back').addEventListener('click', () => goToStep(1));
  $('#rs-btn-back-mapping').addEventListener('click', () => goToStep(2));

  // ---- Multi-item add/delete ----
  const MULTI_TEMPLATES = {
    edu: `<div class="field-row"><div class="field"><label>학교명</label><input type="text" data-key="school" placeholder="OO대학교"></div><div class="field"><label>전공</label><input type="text" data-key="major" placeholder="컴퓨터공학"></div></div><div class="field-row" style="margin-top:.4rem"><div class="field"><label>기간</label><input type="text" data-key="period" placeholder="2018.03 ~ 2024.02"></div><div class="field"><label>학점</label><input type="text" data-key="gpa" placeholder="3.8 / 4.5"></div></div>`,
    exp: `<div class="field-row"><div class="field"><label>회사명</label><input type="text" data-key="company" placeholder="OO회사"></div><div class="field"><label>직무</label><input type="text" data-key="role" placeholder="백엔드 개발자"></div></div><div class="field-row" style="margin-top:.4rem"><div class="field"><label>기간</label><input type="text" data-key="period" placeholder="2023.01 ~ 2024.06"></div><div class="field"><label>주요 성과</label><input type="text" data-key="desc" placeholder="API 응답속도 40% 개선"></div></div>`,
    cert: `<div class="field-row"><div class="field"><label>자격증명</label><input type="text" data-key="name" placeholder="정보처리기사"></div><div class="field"><label>취득일</label><input type="text" data-key="date" placeholder="2023.06"></div></div>`,
    proj: `<div class="field-row"><div class="field"><label>프로젝트명</label><input type="text" data-key="name" placeholder="커버레터 빌더"></div><div class="field"><label>기간</label><input type="text" data-key="period" placeholder="2024.01 ~ 2024.03"></div></div><div class="field-row" style="margin-top:.4rem"><div class="field"><label>역할</label><input type="text" data-key="role" placeholder="풀스택 개발"></div><div class="field"><label>성과/설명</label><input type="text" data-key="desc" placeholder="사용자 500명 달성"></div></div>`,
  };

  $$('.btn-add-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const listId = btn.dataset.target;
      const list = $(`#${listId}`);
      const first = list.querySelector('.multi-item');
      if (!first) return;
      const group = first.dataset.group;
      const tpl = MULTI_TEMPLATES[group];
      if (!tpl) return;

      const item = document.createElement('div');
      item.className = 'multi-item';
      item.dataset.group = group;
      item.innerHTML = tpl;
      const del = document.createElement('button');
      del.className = 'multi-del';
      del.textContent = '\u00d7';
      del.addEventListener('click', () => item.remove());
      item.appendChild(del);
      list.appendChild(item);
    });
  });

  // Add delete buttons to initial items
  $$('.multi-item').forEach((item) => {
    const del = document.createElement('button');
    del.className = 'multi-del';
    del.textContent = '\u00d7';
    del.addEventListener('click', () => item.remove());
    item.appendChild(del);
  });

  // ---- Tech Tag Input ----
  const techTags = $('#rs-tech-tags');
  const techInput = $('#rs-tech-input');
  const techSet = new Set();

  techInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = techInput.value.replace(/,/g, '').trim();
      if (val && !techSet.has(val)) {
        techSet.add(val);
        renderTechTags();
      }
      techInput.value = '';
    }
    if (e.key === 'Backspace' && !techInput.value && techSet.size > 0) {
      const last = [...techSet].pop();
      techSet.delete(last);
      renderTechTags();
    }
  });

  function renderTechTags() {
    techTags.innerHTML = '';
    for (const tag of techSet) {
      const el = document.createElement('span');
      el.className = 'tech-tag';
      el.innerHTML = `${tag}<button class="tag-x">&times;</button>`;
      el.querySelector('.tag-x').addEventListener('click', () => { techSet.delete(tag); renderTechTags(); });
      techTags.appendChild(el);
    }
  }

  // Click on wrapper focuses input
  $('.tag-input-wrap')?.addEventListener('click', () => techInput.focus());

  // ---- Collect multi-item data ----
  function collectMultiItems(listId) {
    const items = [];
    $$(`#${listId} .multi-item`).forEach((item) => {
      const data = {};
      let hasValue = false;
      item.querySelectorAll('input[data-key]').forEach((inp) => {
        data[inp.dataset.key] = inp.value.trim();
        if (inp.value.trim()) hasValue = true;
      });
      if (hasValue) items.push(data);
    });
    return items;
  }

  // Layout selector
  $$('.layout-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const layout = card.dataset.layout;
      if (layout === 'ai') {
        await aiLayoutRecommend();
        return;
      }
      $$('.layout-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      rsLayout = layout;
      regenerateHTMLPreview();
    });
  });

  async function aiLayoutRecommend() {
    showToast('AI가 레이아웃을 분석 중...');
    try {
      const params = getResumeParams();
      const prompt = ResumeGenerator.buildLayoutPrompt(params);
      const raw = await Gemini.generate(prompt);
      const clean = raw.replace(/```json\s*/i, '').replace(/```/g, '').trim();
      const result = JSON.parse(clean);
      if (result.layout && ['classic', 'modern', 'minimal'].includes(result.layout)) {
        rsLayout = result.layout;
        $$('.layout-card').forEach((c) => c.classList.toggle('active', c.dataset.layout === rsLayout));
        regenerateHTMLPreview();
        showToast(`AI 추천: ${ResumeGenerator.LAYOUTS[rsLayout].name} (${result.reason})`);
      }
    } catch {
      showToast('AI 추천 실패, 클래식으로 유지');
    }
  }

  function getResumeFormData() {
    return {
      name: $('#rs-name').value.trim(),
      birth: $('#rs-birth').value.trim(),
      phone: $('#rs-phone').value.trim(),
      email: $('#rs-email').value.trim(),
      address: $('#rs-address').value.trim(),
      educations: collectMultiItems('rs-edu-list'),
      experiences: collectMultiItems('rs-exp-list'),
      certificates: collectMultiItems('rs-cert-list'),
      projects: collectMultiItems('rs-proj-list'),
      tech: [...techSet].join(', '),
    };
  }

  function getResumeParams() {
    return {
      mappings: collectMappings('rs-mapping-list', state['resume'].tree),
      formData: getResumeFormData(),
      rootText: state['resume'].tree?.root.text || '',
      layout: rsLayout,
    };
  }

  function regenerateHTMLPreview() {
    const params = getResumeParams();
    rsHTMLContent = ResumeGenerator.generateHTML(params);
    const preview = $('#rs-md-preview');
    preview.style.overflow = 'auto';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;border:none;min-height:600px;max-height:800px';
    preview.innerHTML = '';
    preview.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(rsHTMLContent);
    iframe.contentDocument.close();
  }

  async function rsGenerate() {
    const params = getResumeParams();
    const btn = $('#rs-btn-generate');
    const txt = $('#rs-btn-gen-text');
    setLoading(btn, txt, true, '');

    try {
      const prompt = ResumeGenerator.buildAIPrompt(params);
      const md = await Gemini.generate(prompt);
      const cleaned = md.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '').trim();
      $('#rs-md-editor').value = cleaned;
    } catch {
      showToast('AI 실패, 템플릿 전환', 3000);
      $('#rs-md-editor').value = ResumeGenerator.generateMD(params);
    } finally {
      setLoading(btn, txt, false, 'AI 이력서 생성');
    }

    rsHTMLContent = ResumeGenerator.generateHTML(params);
    rsEditor.setMode('preview');
    regenerateHTMLPreview();
    goToStep(3);
    showToast('이력서 생성 완료');
  }

  $('#rs-btn-generate').addEventListener('click', () => rsGenerate().catch(() => showToast('오류 발생')));
  $('#rs-btn-regenerate').addEventListener('click', () => rsGenerate().catch(() => showToast('오류 발생')));

  $('#rs-btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText($('#rs-md-editor').value).then(() => showToast('복사됨')).catch(() => showToast('복사 실패'));
  });
  $('#rs-btn-dl-md').addEventListener('click', () => {
    const name = $('#rs-name').value.trim() || '이력서';
    downloadFile($('#rs-md-editor').value, `이력서_${name}.md`, 'text/markdown;charset=utf-8');
  });
  $('#rs-btn-dl-html').addEventListener('click', () => {
    const name = $('#rs-name').value.trim() || '이력서';
    downloadFile(rsHTMLContent || ResumeGenerator.generateHTML(getResumeParams()), `이력서_${name}.html`, 'text/html;charset=utf-8');
  });

  // ========== Init ==========
  initMainTabs();
  syncStepNav();
})();
