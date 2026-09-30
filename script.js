(function () {
  const API = ''; // пустая строка = тот же домен (localhost:3000)
  const ACCESS_CODE = '2375';

  // ========================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ API
  // ========================================================
  async function apiGet(url) {
    const res = await fetch(API + url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function apiDelete(url) {
    const res = await fetch(API + url, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function apiPatch(url) {
    const res = await fetch(API + url, { method: 'PATCH' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // ========================================================
  // КАЛЕНДАРИ
  // ========================================================
  function createHiddenDatePicker(inputId, targetInputId) {
    let hiddenInput = document.getElementById(inputId);
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'date';
      hiddenInput.id = inputId;
      hiddenInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0';
      document.body.appendChild(hiddenInput);
    }

    const pickerBtn = document.getElementById(targetInputId === 'contractDate' ? 'datePickerBtn' : 'validPickerBtn');
    const targetInput = document.getElementById(targetInputId);

    pickerBtn.onclick = function (e) {
      e.preventDefault();
      const currentText = targetInput.value.trim();
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(currentText)) {
        const parts = currentText.split('.');
        const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (!isNaN(new Date(formatted).getTime())) hiddenInput.value = formatted;
      }
      hiddenInput.showPicker();
    };

    hiddenInput.onchange = function () {
      if (hiddenInput.value) {
        const [year, month, day] = hiddenInput.value.split('-');
        targetInput.value = `${day}.${month}.${year}`;
        validateDateField(targetInputId);
      }
    };
  }

  createHiddenDatePicker('hiddenDate1', 'contractDate');
  createHiddenDatePicker('hiddenDate2', 'validUntil');

  // ========================================================
  // ВАЛИДАЦИЯ ДАТ
  // ========================================================
  function parseRuDate(value) {
    const match = String(value || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const day = +match[1], month = +match[2], year = +match[3];
    if (month < 1 || month > 12) return null;
    if (year < 1900 || year > 2100) return null;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;
    return new Date(year, month - 1, day);
  }

  function validateDateField(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    const value = input.value.trim();

    input.classList.remove('invalid', 'date-valid');
    errorEl.textContent = '';

    if (!value) return true;

    const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) {
      input.classList.add('invalid');
      errorEl.textContent = 'Введите дату в формате дд.мм.гггг';
      updateCreateBtnState();
      return false;
    }

    const day = +match[1], month = +match[2], year = +match[3];

    if (month < 1 || month > 12) {
      input.classList.add('invalid');
      errorEl.textContent = 'Месяц должен быть от 01 до 12';
      updateCreateBtnState();
      return false;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      input.classList.add('invalid');
      errorEl.textContent = `В месяце ${daysInMonth} дней, проверьте день`;
      updateCreateBtnState();
      return false;
    }

    if (year < 1900 || year > 2100) {
      input.classList.add('invalid');
      errorEl.textContent = 'Год должен быть в диапазоне 1900–2100';
      updateCreateBtnState();
      return false;
    }

    if (inputId === 'validUntil') {
      const startVal = document.getElementById('contractDate').value.trim();
      const startDate = parseRuDate(startVal);
      const endDate = parseRuDate(value);
      if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
        input.classList.add('invalid');
        errorEl.textContent = 'Дата «Действует до» должна быть позже даты договора';
        updateCreateBtnState();
        return false;
      }
    }

    if (inputId === 'contractDate') {
      const untilInput = document.getElementById('validUntil');
      if (untilInput.value.trim()) {
        const untilOk = parseRuDate(untilInput.value.trim());
        const startDate = parseRuDate(value);
        const untilErr = document.getElementById('validUntilError');
        if (untilOk && startDate && untilOk.getTime() <= startDate.getTime()) {
          untilInput.classList.add('invalid');
          untilInput.classList.remove('date-valid');
          untilErr.textContent = 'Дата «Действует до» должна быть позже даты договора';
        } else if (untilOk) {
          untilInput.classList.remove('invalid');
          untilInput.classList.add('date-valid');
          untilErr.textContent = '';
        }
      }
    }

    input.classList.add('date-valid');
    updateCreateBtnState();
    return true;
  }

  function attachDateMask(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function () {
      let value = this.value.replace(/\D/g, '');
      if (value.length > 8) value = value.slice(0, 8);
      let result = '';
      if (value.length > 0) {
        result = value.slice(0, 2);
        if (value.length >= 3) result += '.' + value.slice(2, 4);
        if (value.length >= 5) result += '.' + value.slice(4, 8);
      }
      this.value = result;
      this.classList.remove('date-valid');
      if (value.length === 8) validateDateField(inputId);
      else {
        const errorEl = document.getElementById(inputId + 'Error');
        if (errorEl) errorEl.textContent = '';
        this.classList.remove('invalid');
      }
    });

    input.addEventListener('blur', function () {
      if (this.value.trim()) validateDateField(inputId);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && this.value.endsWith('.')) {
        e.preventDefault();
        this.value = this.value.slice(0, -2);
      }
    });
  }

  attachDateMask('contractDate');
  attachDateMask('validUntil');

  // ========================================================
  // ТЕЛЕФОН
  // ========================================================
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');

  phoneInput.addEventListener('input', function () {
    let digits = this.value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);

    let result = '+7';
    if (digits.length > 1) result += ' (' + digits.slice(1, 4);
    if (digits.length >= 5) result += ') ' + digits.slice(4, 7);
    if (digits.length >= 8) result += '-' + digits.slice(7, 9);
    if (digits.length >= 10) result += '-' + digits.slice(9, 11);
    this.value = result;
    validatePhone();
  });

  phoneInput.addEventListener('blur', validatePhone);

  function validatePhone() {
    const digits = phoneInput.value.replace(/\D/g, '');
    phoneInput.classList.remove('invalid');
    phoneError.textContent = '';
    if (!phoneInput.value.trim() || digits === '7') return true;
    if (digits.length !== 11) {
      phoneInput.classList.add('invalid');
      phoneError.textContent = 'Телефон должен содержать 11 цифр';
      updateCreateBtnState();
      return false;
    }
    updateCreateBtnState();
    return true;
  }

  // ========================================================
  // ЧИСЛОВЫЕ ПОЛЯ
  // ========================================================
  function attachNumericValidation(inputId, validLengths, fieldName) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    if (!input || !errorEl) return;

    input.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, Math.max(...validLengths));
      this.classList.remove('invalid');
      errorEl.textContent = '';
    });

    input.addEventListener('blur', function () {
      const val = this.value.trim();
      this.classList.remove('invalid');
      errorEl.textContent = '';
      if (!val) return true;
      if (!validLengths.includes(val.length)) {
        this.classList.add('invalid');
        const lengthsStr = validLengths.length > 1
          ? `${validLengths.slice(0, -1).join(', ')} или ${validLengths.slice(-1)}`
          : `${validLengths[0]}`;
        errorEl.textContent = `${fieldName} должен содержать ${lengthsStr} цифр`;
        updateCreateBtnState();
        return false;
      }
      updateCreateBtnState();
      return true;
    });
  }

  attachNumericValidation('inn', [10, 12], 'ИНН');
  attachNumericValidation('kpp', [9], 'КПП');
  attachNumericValidation('ogrn', [13, 15], 'ОГРН/ОГРНИП');
  attachNumericValidation('bik', [9], 'БИК');
  attachNumericValidation('account', [20], 'Расчетный счет');
  attachNumericValidation('corrAccount', [20], 'Корр. счет');
  attachNumericValidation('okpo', [8, 10], 'ОКПО');

  // ========================================================
  // EMAIL
  // ========================================================
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');

  emailInput.addEventListener('blur', function () {
    this.classList.remove('invalid');
    emailError.textContent = '';
    const val = this.value.trim();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      this.classList.add('invalid');
      emailError.textContent = 'Введите корректный email';
    }
    updateCreateBtnState();
  });

  emailInput.addEventListener('input', function () {
    this.classList.remove('invalid');
    emailError.textContent = '';
  });

  document.getElementById('position').addEventListener('blur', function () {
    this.value = formatPosition(this.value);
  });

  // ========================================================
  // ОКВЭД
  // ========================================================
  const okvedInput = document.getElementById('okved');
  const okvedError = document.getElementById('okvedError');

  okvedInput.addEventListener('input', function () {
    let value = this.value.replace(/[^\d.]/g, '');
    value = value.replace(/^\./, '').replace(/\.{2,}/g, '.');
    if (value.length > 8) value = value.slice(0, 8);
    this.value = value;
    this.classList.remove('invalid');
    okvedError.textContent = '';
  });

  okvedInput.addEventListener('blur', function () {
    this.classList.remove('invalid');
    okvedError.textContent = '';
    const val = this.value.trim();
    if (!val) return true;
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length < 4 || digitsOnly.length > 6) {
      this.classList.add('invalid');
      okvedError.textContent = 'ОКВЭД должен содержать от 4 до 6 цифр (например 62.01 или 62.01.15)';
      updateCreateBtnState();
      return false;
    }
    if (!/^\d{2}\.\d{2}(\.\d{1,2})?$/.test(val)) {
      this.classList.add('invalid');
      okvedError.textContent = 'Неверный формат. Примеры: 62.01, 62.01.1, 62.01.15';
      updateCreateBtnState();
      return false;
    }
    updateCreateBtnState();
    return true;
  });

  // ========================================================
  // DaData: ПОИСК ПО ИНН
  // ========================================================
  const findInnBtn = document.getElementById('findByInnBtn');
  const innInput = document.getElementById('inn');

  findInnBtn.addEventListener('click', async function () {
    const inn = innInput.value.trim();
    if (!inn) { alert('Введите ИНН для поиска'); return; }
    if (!/^\d{10}$|^\d{12}$/.test(inn)) { alert('ИНН должен содержать 10 или 12 цифр'); return; }

    const originalHtml = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner"></i> Поиск...';
    this.disabled = true;

    try {
      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Token 23bdca7004ecb466821bfe54ca50bbf5e362efdf'
        },
        body: JSON.stringify({ query: inn, branch_type: 'MAIN' })
      });

      if (!response.ok) throw new Error('Ошибка запроса: ' + response.status);
      const result = await response.json();
      if (!result.suggestions || result.suggestions.length === 0) {
        alert('Компания с таким ИНН не найдена');
        return;
      }

      const company = result.suggestions[0].data;
      document.getElementById('clientName').value = company.name?.short_with_opf || company.name?.full_with_opf || '';
      document.getElementById('kpp').value = company.kpp || '';
      document.getElementById('ogrn').value = company.ogrn || '';
      document.getElementById('legalAddress').value = company.address?.value || '';

      if (company.management) {
        document.getElementById('director').value = company.management.name || '';
        document.getElementById('position').value = formatPosition(company.management.post || '');
      }

      const opf = company.opf?.short || '';
      if (opf.includes('ООО')) document.getElementById('clientType').value = 'ООО';
      else if (opf.includes('АО') && !opf.includes('НАО') && !opf.includes('ПАО')) document.getElementById('clientType').value = 'АО';
      else if (opf.includes('ПАО')) document.getElementById('clientType').value = 'ПАО';
      else if (opf.includes('НАО')) document.getElementById('clientType').value = 'НАО';
      else if (opf.includes('ИП') || inn.length === 12) document.getElementById('clientType').value = 'ИП';

      updateAvailableTemplates();
    } catch (err) {
      console.error(err);
      alert('Ошибка при поиске: ' + err.message);
    } finally {
      this.innerHTML = originalHtml;
      this.disabled = false;
    }
  });

  // ========================================================
  // DaData: ПОИСК ПО БИК
  // ========================================================
  const findBikBtn = document.getElementById('findByBikBtn');
  const bikInput = document.getElementById('bik');
  const bankNameInput = document.getElementById('bankName');
  const corrAccountInput = document.getElementById('corrAccount');

  findBikBtn.addEventListener('click', async function () {
    const bik = bikInput.value.trim();
    if (!bik) { alert('Введите БИК'); return; }
    if (!/^\d{9}$/.test(bik)) { alert('БИК должен содержать 9 цифр'); return; }

    const originalHtml = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner"></i> Поиск...';
    this.disabled = true;

    try {
      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Token 23bdca7004ecb466821bfe54ca50bbf5e362efdf'
        },
        body: JSON.stringify({ query: bik })
      });

      if (!response.ok) throw new Error('Ошибка запроса: ' + response.status);
      const result = await response.json();
      if (!result.suggestions || result.suggestions.length === 0) {
        alert('Банк с таким БИК не найден');
        return;
      }

      const bank = result.suggestions[0].data;
      bankNameInput.value = bank.name?.payment || bank.name?.short || bank.value || '';
      corrAccountInput.value = bank.correspondent_account || '';
    } catch (err) {
      console.error(err);
      alert('Ошибка при поиске: ' + err.message);
    } finally {
      this.innerHTML = originalHtml;
      this.disabled = false;
    }
  });

  // ========================================================
  // ФИЛЬТР ШАБЛОНОВ ПО ТИПУ КЛИЕНТА
  // ========================================================
  const clientTypeInput = document.getElementById('clientType');
  const availableTemplatesBox = document.getElementById('availableTemplates');
  const selectedTemplateInfo = document.getElementById('selectedTemplateInfo');
  const selectedTemplateName = document.getElementById('selectedTemplateName');

  let selectedTemplateId = null;
  let allTemplates = [];

  function normalizeType(t) {
    return (t || '').trim().toUpperCase();
  }

  async function loadTemplates() {
    try {
      allTemplates = await apiGet('/api/templates');
    } catch (e) {
      console.error(e);
      allTemplates = [];
    }
  }

  function updateAvailableTemplates() {
    const clientType = normalizeType(clientTypeInput.value);
    selectedTemplateId = null;
    selectedTemplateInfo.style.display = 'none';
    availableTemplatesBox.innerHTML = '';

    if (!clientType) {
      availableTemplatesBox.innerHTML = '<p class="empty-message">Выберите тип клиента, чтобы увидеть доступные договоры</p>';
      return;
    }

    const filtered = allTemplates.filter(t => normalizeType(t.client_type) === clientType);

    if (filtered.length === 0) {
      availableTemplatesBox.innerHTML = `<p class="empty-message">Для типа «${escapeHtml(clientType)}» шаблоны не добавлены</p>`;
      return;
    }

    filtered.forEach(tpl => {
      const item = document.createElement('div');
      item.className = 'available-template-item';
      item.dataset.id = tpl.id;

      item.innerHTML = `
        <div class="available-template-info">
          <i class="fas fa-file-word"></i>
          <span class="available-template-name">${escapeHtml(tpl.name)}</span>
        </div>
        <span class="available-template-type">${escapeHtml(tpl.client_type)}</span>
      `;

      item.addEventListener('click', () => {
        availableTemplatesBox.querySelectorAll('.available-template-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedTemplateId = tpl.id;
        selectedTemplateName.textContent = tpl.name;
        selectedTemplateInfo.style.display = 'flex';
      });

      availableTemplatesBox.appendChild(item);
    });
  }

  clientTypeInput.addEventListener('input', updateAvailableTemplates);
  clientTypeInput.addEventListener('change', updateAvailableTemplates);

  // ========================================================
  // ФОРМАТИРОВАНИЕ
  // ========================================================
  function cleanClientName(name) {
    if (!name) return '';
    let s = String(name).trim();
    s = s.replace(/^(ООО|ПАО|АО|НАО|ОАО|ЗАО|ИП|НКО|ПК|ТСН|ТСЖ)\s*\.?\s*/i, '');
    s = s.replace(/[«»""„“”']/g, '');
    return s.trim();
  }

  function formatDateForDoc(dateStr) {
    if (!dateStr) return '';
    const m = String(dateStr).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return dateStr;
    return `${m[1]}.${m[2]}.${m[3].slice(-2)}г.`;
  }

  function formatDirectorShort(fullName) {
    if (!fullName) return '';
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts.slice(1).map(p => (p[0] || '').toUpperCase() + '.').join('');
  }

  function formatPosition(pos) {
    if (!pos) return '';
    const s = String(pos).trim().toLowerCase();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function collectFormData() {
    return {
      contractNumber: document.getElementById('contractNumber').value.trim(),
      contractDate: formatDateForDoc(document.getElementById('contractDate').value.trim()),
      validUntil: formatDateForDoc(document.getElementById('validUntil').value.trim()),
      clientType: document.getElementById('clientType').value.trim(),
      clientName: cleanClientName(document.getElementById('clientName').value.trim()),
      inn: document.getElementById('inn').value.trim(),
      kpp: document.getElementById('kpp').value.trim(),
      ogrn: document.getElementById('ogrn').value.trim(),
      okpo: document.getElementById('okpo').value.trim(),
      okved: document.getElementById('okved').value.trim(),
      director: formatDirectorShort(document.getElementById('director').value.trim()),
      position: formatPosition(document.getElementById('position').value.trim()),
      legalAddress: document.getElementById('legalAddress').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      bik: document.getElementById('bik').value.trim(),
      bankName: document.getElementById('bankName').value.trim(),
      account: document.getElementById('account').value.trim(),
      corrAccount: document.getElementById('corrAccount').value.trim()
    };
  }

  // ========================================================
  // ГЕНЕРАЦИЯ DOCX
  // ========================================================
  async function generateDocx(templateArrayBuffer, data) {
    const zip = new PizZip(templateArrayBuffer);
    const doc = new window.docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    });
    doc.render(data);
    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  // ========================================================
  // ВАЛИДАЦИЯ ФОРМЫ
  // ========================================================
  function hasInvalidFields() {
    return document.querySelectorAll('.field input.invalid').length > 0;
  }

  function updateCreateBtnState() {
    const btn = document.getElementById('createDocBtn');
    if (!btn) return;
    if (hasInvalidFields()) {
      btn.disabled = true;
      btn.classList.add('btn-disabled');
      btn.title = 'Исправьте ошибки в форме (поля подсвечены красным)';
    } else {
      if (btn.dataset.busy !== '1') {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
        btn.title = '';
      }
    }
  }

  function validateAllFields() {
    ['inn', 'kpp', 'ogrn', 'okpo', 'bik', 'account', 'corrAccount'].forEach(id => {
      document.getElementById(id).dispatchEvent(new Event('blur'));
    });
    validatePhone();
    emailInput.dispatchEvent(new Event('blur'));
    okvedInput.dispatchEvent(new Event('blur'));
    if (document.getElementById('contractDate').value.trim()) validateDateField('contractDate');
    if (document.getElementById('validUntil').value.trim()) validateDateField('validUntil');
    updateCreateBtnState();
    return !hasInvalidFields();
  }

  // ========================================================
  // КНОПКА "СОЗДАТЬ ДОКУМЕНТ"
  // ========================================================
  document.getElementById('createDocBtn').addEventListener('click', async function () {
    if (hasInvalidFields()) {
      alert('Пожалуйста, исправьте ошибки в форме (подсвечены красным).');
      return;
    }

    const clientType = normalizeType(clientTypeInput.value);
    if (!clientType) { alert('Пожалуйста, укажите тип клиента.'); return; }
    if (selectedTemplateId === null) { alert('Выберите договор из списка доступных.'); return; }

    if (!validateAllFields()) {
      alert('Пожалуйста, исправьте ошибки в форме (подсвечены красным).');
      return;
    }

    const tpl = allTemplates.find(t => t.id === selectedTemplateId);
    if (!tpl) { alert('Выбранный шаблон не найден.'); return; }

    const data = collectFormData();

    const originalText = this.innerHTML;
    this.dataset.busy = '1';
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner"></i> Формируем...';

    const toast = document.createElement('div');
    toast.className = 'loading-toast';
    toast.innerHTML = '<i class="fas fa-spinner"></i> Готовим документ...';
    document.body.appendChild(toast);

    try {
      // 1. Скачиваем шаблон с сервера
      const fileRes = await fetch(API + `/api/templates/${tpl.id}/file`);
      if (!fileRes.ok) throw new Error('Не удалось загрузить шаблон');
      const arrayBuffer = await fileRes.arrayBuffer();

      // 2. Генерируем документ
      const docxBlob = await generateDocx(arrayBuffer, data);
      const downloadName = `${tpl.name}_${data.contractNumber || 'договор'}.docx`;
      saveAs(docxBlob, downloadName);

      // 3. Сохраняем на сервер
      const formData = new FormData();
      formData.append('file', docxBlob, downloadName);
      formData.append('contractNumber', data.contractNumber);
      formData.append('originalContractDate', document.getElementById('contractDate').value.trim());
      formData.append('originalValidUntil', document.getElementById('validUntil').value.trim());
      formData.append('clientType', data.clientType);
      formData.append('clientName', data.clientName);
      formData.append('inn', data.inn);
      formData.append('director', data.director);
      formData.append('templateName', tpl.name);
      formData.append('fileName', downloadName);

      const saveRes = await fetch(API + '/api/contracts', {
        method: 'POST',
        body: formData
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка сохранения на сервер');
      }

      toast.innerHTML = '<i class="fas fa-check-circle"></i> Готово!';
      setTimeout(() => toast.remove(), 1500);
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании документа: ' + err.message);
      toast.remove();
    } finally {
      this.dataset.busy = '0';
      this.disabled = false;
      this.innerHTML = originalText;
      updateCreateBtnState();
    }
  });

  // ========================================================
  // ПАНЕЛЬ АДМИНИСТРАТОРА
  // ========================================================
  const mainApp = document.getElementById('mainApp');
  const adminApp = document.getElementById('adminApp');
  const openAdminBtn = document.getElementById('openAdminBtn');
  const codeModal = document.getElementById('codeModal');
  const accessCodeInput = document.getElementById('accessCodeInput');
  const codeError = document.getElementById('codeError');
  const confirmCodeBtn = document.getElementById('confirmCodeBtn');
  const cancelCodeBtn = document.getElementById('cancelCodeBtn');
  const exitAdminBtn = document.getElementById('exitAdminBtn');

  openAdminBtn.addEventListener('click', () => {
    accessCodeInput.value = '';
    codeError.textContent = '';
    codeModal.classList.add('active');
    setTimeout(() => accessCodeInput.focus(), 100);
  });

  function closeCodeModal() {
    codeModal.classList.remove('active');
  }

  cancelCodeBtn.addEventListener('click', closeCodeModal);
  codeModal.addEventListener('click', (e) => { if (e.target === codeModal) closeCodeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && codeModal.classList.contains('active')) closeCodeModal();
  });

  function tryEnterAdmin() {
    const entered = accessCodeInput.value.trim();
    if (entered === ACCESS_CODE) {
      codeModal.classList.remove('active');
      mainApp.style.display = 'none';
      adminApp.style.display = 'block';
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const contractsBtn = document.querySelector('.tab-btn[data-tab="contracts"]');
      const contractsPanel = document.getElementById('tab-contracts');
      if (contractsBtn) contractsBtn.classList.add('active');
      if (contractsPanel) contractsPanel.classList.add('active');
      renderTemplates();
      resetTemplateForm();
      fetch(API + '/api/contracts/normalize', { method: 'POST' }).catch(() => {});
    } else {
      codeError.textContent = 'Неверный код доступа. Попробуйте снова.';
      accessCodeInput.select();
    }
  }

  confirmCodeBtn.addEventListener('click', tryEnterAdmin);
  accessCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryEnterAdmin(); });

  exitAdminBtn.addEventListener('click', () => {
    adminApp.style.display = 'none';
    mainApp.style.display = 'block';
    loadTemplates().then(updateAvailableTemplates);
  });

  // ========================================================
  // ВКЛАДКИ АДМИНКИ
  // ========================================================
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.add('active');
      if (tab === 'deadlines') renderDeadlines();
      if (tab === 'archive') renderArchive();
    });
  });

  // ========================================================
  // СПИСКИ ДОГОВОРОВ
  // ========================================================
  function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function daysUntil(ruDate) {
    const end = parseRuDate(ruDate);
    if (!end) return null;
    return Math.ceil((end.getTime() - todayStart().getTime()) / (1000 * 60 * 60 * 24));
  }

  function formatDisplayDate(ruDate) {
    return ruDate || '—';
  }

  async function downloadContract(id) {
    try {
      const res = await fetch(API + `/api/contracts/${id}/download`);
      if (!res.ok) throw new Error('Не удалось скачать');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      let name = 'договор.docx';
      const m = disposition.match(/filename="?([^"]+)"?/);
      if (m) name = m[1];
      saveAs(blob, name);
    } catch (err) {
      alert('Ошибка при скачивании: ' + err.message);
    }
  }

  async function renderDeadlines() {
    const box = document.getElementById('deadlinesList');
    if (!box) return;

    let list = [];
    try {
      list = await apiGet('/api/contracts');
      list = list.filter(c => c.status === 'active');
      list.sort((a, b) => {
        const da = parseRuDate(a.original_valid_until);
        const db = parseRuDate(b.original_valid_until);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
    } catch (e) {
      console.error(e);
    }

    box.innerHTML = '';
    if (list.length === 0) {
      box.innerHTML = '<p class="empty-message">Нет действующих договоров</p>';
      return;
    }

    list.forEach(c => {
      const days = daysUntil(c.original_valid_until);
      let daysLabel = '';
      if (days !== null) {
        if (days === 0) daysLabel = 'истекает сегодня';
        else if (days === 1) daysLabel = 'остался 1 день';
        else if (days > 1 && days < 5) daysLabel = `осталось ${days} дня`;
        else daysLabel = `осталось ${days} дн.`;
      }

      const item = document.createElement('div');
      item.className = 'contract-item';
      item.innerHTML = `
        <div class="contract-info">
          <div class="contract-title">
            <i class="fas fa-file-contract"></i>
            <span>№ ${escapeHtml(c.contract_number || 'б/н')}</span>
            <span class="contract-status active">Действует</span>
          </div>
          <div class="contract-meta">
            <span><i class="fas fa-building"></i> ${escapeHtml(c.client_name || '—')} (${escapeHtml(c.client_type || '')})</span>
            <span><i class="fas fa-calendar"></i> от ${formatDisplayDate(c.original_contract_date)}</span>
            <span><i class="fas fa-hourglass-end"></i> до ${formatDisplayDate(c.original_valid_until)}${daysLabel ? ' · ' + daysLabel : ''}</span>
            ${c.template_name ? `<span><i class="fas fa-file-word"></i> ${escapeHtml(c.template_name)}</span>` : ''}
          </div>
        </div>
        <div class="contract-actions">
          <button class="btn-download" data-id="${c.id}" title="Скачать договор">
            <i class="fas fa-download"></i> Скачать
          </button>
          <button class="btn-terminate" data-id="${c.id}" title="Расторгнуть договор">
            <i class="fas fa-ban"></i> Расторгнуть
          </button>
        </div>
      `;
      box.appendChild(item);
    });

    box.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', () => downloadContract(btn.dataset.id));
    });

    box.querySelectorAll('.btn-terminate').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Расторгнуть этот договор? Он будет перемещён в Архив.')) return;
        try {
          await apiPatch(`/api/contracts/${btn.dataset.id}/terminate`);
          renderDeadlines();
        } catch (e) {
          alert('Ошибка: ' + e.message);
        }
      });
    });
  }

  async function renderArchive() {
    const box = document.getElementById('archiveList');
    if (!box) return;

    let list = [];
    try {
      list = await apiGet('/api/contracts');
      list = list.filter(c => c.status === 'terminated' || c.status === 'expired');
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'terminated' ? -1 : 1;
        const da = parseRuDate(a.original_valid_until);
        const db = parseRuDate(b.original_valid_until);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.getTime() - da.getTime();
      });
    } catch (e) {
      console.error(e);
    }

    box.innerHTML = '';
    if (list.length === 0) {
      box.innerHTML = '<p class="empty-message">Архив пуст</p>';
      return;
    }

    list.forEach(c => {
      const isTerm = c.status === 'terminated';
      const item = document.createElement('div');
      item.className = 'contract-item ' + (isTerm ? 'terminated' : 'expired');
      const statusLabel = isTerm ? 'Расторгнут' : 'Истёк срок';
      const statusClass = isTerm ? 'terminated' : 'expired';

      item.innerHTML = `
        <div class="contract-info">
          <div class="contract-title">
            <i class="fas fa-file-contract"></i>
            <span>№ ${escapeHtml(c.contract_number || 'б/н')}</span>
            <span class="contract-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="contract-meta">
            <span><i class="fas fa-building"></i> ${escapeHtml(c.client_name || '—')} (${escapeHtml(c.client_type || '')})</span>
            <span><i class="fas fa-calendar"></i> от ${formatDisplayDate(c.original_contract_date)}</span>
            <span><i class="fas fa-hourglass-end"></i> до ${formatDisplayDate(c.original_valid_until)}</span>
            ${c.template_name ? `<span><i class="fas fa-file-word"></i> ${escapeHtml(c.template_name)}</span>` : ''}
            ${isTerm && c.terminated_at ? `<span><i class="fas fa-ban"></i> расторгнут ${new Date(c.terminated_at).toLocaleDateString('ru-RU')}</span>` : ''}
          </div>
        </div>
        <div class="contract-actions">
          <button class="btn-download" data-id="${c.id}" title="Скачать договор">
            <i class="fas fa-download"></i> Скачать
          </button>
        </div>
      `;
      box.appendChild(item);
    });

    box.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', () => downloadContract(btn.dataset.id));
    });
  }

  // ========================================================
  // АДМИН: ЗАГРУЗКА ШАБЛОНОВ
  // ========================================================
  const templateNameInput = document.getElementById('templateName');
  const templateClientTypeSelect = document.getElementById('templateClientType');
  const uploadArea = document.getElementById('uploadArea');
  const templateFileInput = document.getElementById('templateFileInput');
  const uploadHint = document.getElementById('uploadHint');
  const selectedFileInfo = document.getElementById('selectedFileInfo');
  const selectedFileName = document.getElementById('selectedFileName');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const addTemplateBtn = document.getElementById('addTemplateBtn');
  const templatesList = document.getElementById('templatesList');

  let pendingFile = null;

  function resetTemplateForm() {
    templateNameInput.value = '';
    templateClientTypeSelect.value = '';
    pendingFile = null;
    selectedFileInfo.style.display = 'none';
    selectedFileName.textContent = '';
    uploadHint.textContent = '';
    uploadHint.classList.remove('error');
    uploadArea.style.display = 'block';
  }

  uploadArea.addEventListener('click', () => templateFileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) setPendingFile(e.dataTransfer.files[0]);
  });

  templateFileInput.addEventListener('change', function () {
    if (this.files.length) setPendingFile(this.files[0]);
    this.value = '';
  });

  function setPendingFile(file) {
    uploadHint.textContent = '';
    uploadHint.classList.remove('error');
    if (!file.name.toLowerCase().endsWith('.docx')) {
      uploadHint.textContent = 'Можно загружать только файлы .docx';
      uploadHint.classList.add('error');
      return;
    }
    pendingFile = file;
    selectedFileName.textContent = file.name;
    selectedFileInfo.style.display = 'flex';
    uploadArea.style.display = 'none';
  }

  clearFileBtn.addEventListener('click', () => {
    pendingFile = null;
    selectedFileInfo.style.display = 'none';
    selectedFileName.textContent = '';
    uploadArea.style.display = 'block';
  });

  addTemplateBtn.addEventListener('click', async () => {
    const name = templateNameInput.value.trim();
    const clientType = templateClientTypeSelect.value;

    if (!name) {
      uploadHint.textContent = 'Укажите название договора';
      uploadHint.classList.add('error');
      return;
    }
    if (!clientType) {
      uploadHint.textContent = 'Выберите тип клиента';
      uploadHint.classList.add('error');
      return;
    }
    if (!pendingFile) {
      uploadHint.textContent = 'Выберите файл шаблона (.docx)';
      uploadHint.classList.add('error');
      return;
    }

    addTemplateBtn.disabled = true;
    const originalText = addTemplateBtn.innerHTML;
    addTemplateBtn.innerHTML = '<i class="fas fa-spinner"></i> Сохраняем...';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('clientType', clientType);
      formData.append('file', pendingFile);

      const res = await fetch(API + '/api/templates', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');

      uploadHint.textContent = `Шаблон «${name}» для типа «${clientType}» успешно добавлен`;
      uploadHint.classList.remove('error');
      resetTemplateForm();
      await loadTemplates();
      renderTemplates();
      setTimeout(() => { uploadHint.textContent = ''; }, 4000);
    } catch (err) {
      console.error(err);
      uploadHint.textContent = 'Ошибка: ' + err.message;
      uploadHint.classList.add('error');
    } finally {
      addTemplateBtn.disabled = false;
      addTemplateBtn.innerHTML = originalText;
    }
  });

  // ========================================================
  // СПИСОК ШАБЛОНОВ
  // ========================================================
  async function renderTemplates() {
    templatesList.innerHTML = '';
    try {
      allTemplates = await apiGet('/api/templates');
    } catch (e) {
      templatesList.innerHTML = '<p class="empty-message">Ошибка загрузки шаблонов</p>';
      return;
    }

    if (allTemplates.length === 0) {
      templatesList.innerHTML = '<p class="empty-message">Шаблоны пока не добавлены</p>';
      return;
    }

    allTemplates.forEach(tpl => {
      const item = document.createElement('div');
      item.className = 'template-item';
      const sizeKB = (tpl.size / 1024).toFixed(1);
      const dateStr = tpl.created_at ? new Date(tpl.created_at).toLocaleDateString('ru-RU') : '';

      item.innerHTML = `
        <div class="template-info">
          <i class="fas fa-file-word"></i>
          <div class="template-meta">
            <span class="template-name">${escapeHtml(tpl.name)}</span>
            <div class="template-badges">
              <span class="badge badge-type">${escapeHtml(tpl.client_type)}</span>
              <span class="badge badge-file">${escapeHtml(tpl.file_name)}</span>
            </div>
            <span class="template-size">${sizeKB} КБ • ${dateStr}</span>
          </div>
        </div>
        <button class="btn-delete" data-id="${tpl.id}" title="Удалить шаблон">
          <i class="fas fa-trash-alt"></i>
        </button>
      `;
      templatesList.appendChild(item);
    });

    templatesList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Удалить этот шаблон?')) return;
        try {
          await apiDelete(`/api/templates/${this.dataset.id}`);
          await loadTemplates();
          renderTemplates();
        } catch (e) {
          alert('Ошибка удаления: ' + e.message);
        }
      });
    });
  }

  // ========================================================
  // УТИЛИТЫ
  // ========================================================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========================================================
  // СТАРТ
  // ========================================================
  loadTemplates().then(updateAvailableTemplates);
})();