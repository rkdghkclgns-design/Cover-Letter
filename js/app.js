/**
 * Cover Letter Builder v3 — Supabase + Gemini AI
 */
(function () {
  'use strict';

  let mindmapTree = null;
  let currentStep = 1;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const steps = { 1: $('#step-upload'), 2: $('#step-mapping'), 3: $('#step-editor') };
  const progressFill = $('#progress-fill');
  const stepsNav = $('#steps-nav');

  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const fileInfo = $('#file-info');
  const fileName = $('#file-name');
  const removeFileBtn = $('#remove-file');
  const loadDemoBtn = $('#load-demo');

  const treeView = $('#tree-view');
  const mappingList = $('#mapping-list');
  const companyInput = $('#company-name');
  const positionInput = $('#position-name');

  const btnGenerate = $('#btn-generate');
  const btnGenerateText = $('#btn-generate-text');

  const editorContainer = $('#editor-container');
  const mdEditor = $('#md-editor');
  const mdPreview = $('#md-preview');
  const toast = $('#toast');

  // ========== Navigation ==========
  function goToStep(n) {
    if (n === currentStep) return;
    steps[currentStep]?.classList.remove('active');
    steps[currentStep]?.classList.add('hidden');
    currentStep = n;
    steps[n]?.classList.remove('hidden');
    steps[n]?.classList.add('active');
    progressFill.style.width = `${(n / 3) * 100}%`;
    stepsNav.querySelectorAll('.nav-step').forEach((btn) => {
      const s = Number(btn.dataset.step);
      btn.classList.toggle('active', s === n);
      btn.classList.toggle('done', s < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  stepsNav.querySelectorAll('.nav-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = Number(btn.dataset.step);
      if (target < currentStep) goToStep(target);
      if (target === 2 && currentStep === 1 && mindmapTree) goToStep(2);
      if (target === 3 && currentStep === 2) generateAndGo().catch(() => showToast('오류가 발생했습니다'));
    });
  });

  // ========== Toast ==========
  function showToast(msg, dur = 2500) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), dur);
  }

  // ========== Upload ==========
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  removeFileBtn.addEventListener('click', () => {
    mindmapTree = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    dropZone.style.display = '';
  });

  loadDemoBtn.addEventListener('click', () => {
    mindmapTree = EmmParser.createDemoData();
    fileName.textContent = 'demo-data.emm';
    fileInfo.classList.remove('hidden');
    dropZone.style.display = 'none';
    showToast('데모 데이터 로드 완료');
    buildMapping();
    goToStep(2);
  });

  function handleFile(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.emm', '.mm', '.xml'].includes(ext)) {
      showToast('지원하지 않는 파일 형식입니다');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        mindmapTree = EmmParser.parse(e.target.result);
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
        dropZone.style.display = 'none';
        showToast('파일 파싱 완료');
        buildMapping();
        goToStep(2);
      } catch (err) {
        showToast('파싱 실패: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ========== Mapping ==========
  function buildMapping() {
    if (!mindmapTree) return;
    renderTree();
    renderMappingRows();
  }

  function renderTree() {
    treeView.innerHTML = '';
    const frag = document.createDocumentFragment();
    buildTreeNode(frag, mindmapTree.root, 0);
    treeView.appendChild(frag);
  }

  function buildTreeNode(parent, node, depth) {
    const wrapper = document.createElement('div');
    wrapper.className = depth === 0 ? 'tree-node tree-root' : 'tree-node';
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.dataset.depth = depth;
    const dot = document.createElement('span');
    dot.className = `tree-dot${depth === 0 ? ' root' : node.children?.length > 0 && depth > 0 ? ' branch' : ''}`;
    const text = document.createElement('span');
    text.className = 'tree-text';
    text.textContent = node.text;
    item.appendChild(dot);
    item.appendChild(text);
    wrapper.appendChild(item);
    if (node.children) {
      for (const child of node.children) buildTreeNode(wrapper, child, depth + 1);
    }
    parent.appendChild(wrapper);
  }

  function renderMappingRows() {
    mappingList.innerHTML = '';
    const branches = EmmParser.getBranches(mindmapTree);
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
      for (const sec of Generator.SECTIONS) {
        const opt = document.createElement('option');
        opt.value = sec.key;
        opt.textContent = sec.label;
        select.appendChild(opt);
      }
      select.value = Generator.suggestSection(branch.text);
      row.appendChild(name);
      row.appendChild(arrow);
      row.appendChild(select);
      mappingList.appendChild(row);
    }
  }

  // ========== Custom Sections ==========
  let customIdCounter = 0;

  $('#btn-add-section').addEventListener('click', addCustomSection);
  $('#custom-section-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCustomSection();
  });

  function addCustomSection() {
    const input = $('#custom-section-input');
    const name = input.value.trim();
    if (!name) { showToast('섹션명을 입력하세요'); return; }

    customIdCounter++;
    const id = `custom-${customIdCounter}`;

    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.dataset.custom = 'true';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'mapping-name';
    nameSpan.textContent = name;
    nameSpan.title = name;

    const arrow = document.createElement('span');
    arrow.className = 'mapping-arrow';
    arrow.textContent = '\u2192';

    const select = document.createElement('select');
    select.className = 'mapping-select';
    select.dataset.branchId = id;
    select.dataset.customName = name;

    for (const sec of Generator.SECTIONS) {
      const opt = document.createElement('option');
      opt.value = sec.key;
      opt.textContent = sec.label;
      select.appendChild(opt);
    }
    select.value = Generator.suggestSection(name);

    const del = document.createElement('button');
    del.className = 'mapping-del';
    del.textContent = '\u00d7';
    del.title = '섹션 삭제';
    del.addEventListener('click', () => row.remove());

    row.appendChild(nameSpan);
    row.appendChild(arrow);
    row.appendChild(select);
    row.appendChild(del);
    mappingList.appendChild(row);

    input.value = '';
    showToast(`"${name}" 섹션 추가됨`);
  }

  // ========== Collect Mappings ==========
  function collectMappings() {
    const branches = EmmParser.getBranches(mindmapTree);
    const selects = mappingList.querySelectorAll('.mapping-select');
    const mappings = [];
    selects.forEach((sel) => {
      const branchId = sel.dataset.branchId;
      const customName = sel.dataset.customName;

      if (customName) {
        // 커스텀 섹션 (마인드맵 브랜치 없음)
        mappings.push({
          branchId: branchId,
          branchText: customName,
          sectionKey: sel.value,
          children: [],
        });
      } else {
        const branch = branches.find((b) => b.id === branchId);
        if (branch) {
          mappings.push({
            branchId: branch.id,
            branchText: branch.text,
            sectionKey: sel.value,
            children: branch.children,
          });
        }
      }
    });
    return {
      mappings,
      company: companyInput.value.trim(),
      position: positionInput.value.trim(),
      rootText: mindmapTree.root.text,
    };
  }

  // ========== Generation ==========
  function setLoading(loading) {
    if (loading) {
      btnGenerate.classList.add('btn-loading');
      btnGenerateText.textContent = 'AI 생성 중...';
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      btnGenerate.prepend(spinner);
    } else {
      btnGenerate.classList.remove('btn-loading');
      const spinner = btnGenerate.querySelector('.btn-spinner');
      if (spinner) spinner.remove();
      btnGenerateText.textContent = 'AI 자기소개서 생성';
    }
  }

  async function generateAndGo() {
    const params = collectMappings();
    setLoading(true);

    try {
      const md = await Gemini.generateCoverLetter(params);
      mdEditor.value = md;
      renderPreview();
      setMode('preview');
      goToStep(3);
      showToast('AI 자기소개서 생성 완료');
    } catch (err) {
      showToast('AI 생성 실패, 템플릿으로 전환', 3000);
      // 템플릿 폴백
      const md = Generator.generate(params);
      mdEditor.value = md;
      renderPreview();
      setMode('preview');
      goToStep(3);
    } finally {
      setLoading(false);
    }
  }

  // ========== Editor ==========
  function renderPreview() {
    if (typeof marked !== 'undefined') {
      mdPreview.innerHTML = DOMPurify.sanitize(marked.parse(mdEditor.value));
    } else {
      mdPreview.innerHTML = mdEditor.value
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
  }

  function setMode(mode) {
    editorContainer.dataset.mode = mode;
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    if (mode === 'edit' || mode === 'split') mdEditor.focus();
    if (mode !== 'edit') renderPreview();
  }

  $$('.tab').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  let debounce = null;
  mdEditor.addEventListener('input', () => {
    if (editorContainer.dataset.mode === 'split') {
      clearTimeout(debounce);
      debounce = setTimeout(renderPreview, 250);
    }
  });

  $('#btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(mdEditor.value)
      .then(() => showToast('클립보드에 복사됨'))
      .catch(() => { mdEditor.select(); document.execCommand('copy'); showToast('복사됨'); });
  });

  $('#btn-download').addEventListener('click', () => {
    const company = companyInput.value.trim();
    const position = positionInput.value.trim();
    const sanitize = (s) => s.replace(/[/\\:*?"<>|]/g, '_');
    let name = '자기소개서';
    if (company) name += `_${sanitize(company)}`;
    if (position) name += `_${sanitize(position)}`;
    name += '.md';
    const blob = new Blob([mdEditor.value], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 200);
    showToast(`${name} 다운로드 완료`);
  });

  $('#btn-back-upload').addEventListener('click', () => goToStep(1));
  btnGenerate.addEventListener('click', generateAndGo);
  $('#btn-back-mapping').addEventListener('click', () => goToStep(2));
  $('#btn-regenerate').addEventListener('click', generateAndGo);
})();
