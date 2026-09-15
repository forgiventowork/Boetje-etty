
        // Supabase credentials placeholder
        const SUPABASE_URL = 'https://jjqqgtdptqjwydqbgdqb.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcXFndGRwdHFqd3lkcWJnZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDE2MjksImV4cCI6MjEwNDk3NzYyOX0.TwhCQqip_t0tWSQP43WE3eJgyjPhq3eVToMALWcFH1U';
        const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Default standard fee per month
        const STANDARD_MONTHLY_FEE = 20000;
        const MONTH_NAMES = ['JAN', 'FEB', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AUG', 'SEPT', 'OKT', 'NOV'];

        // App state
        let appData = {
            saldoAwal: 0,
            year: 2026,
            bankInfo: {
                bank: 'BCA',
                accountNumber: '0440876757',
                accountHolder: 'Pricilia Linda Salhuteru'
            },
            members: []
        };
        let activeView = 'table'; // 'table' or 'cards'
        let currentModalMemberId = null;
        let currentModalMonthIndex = null;
        let deferredPrompt = null;

        // Load data from Supabase
        async function loadStorage() {
            try {
                if(SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
                    console.warn("Please update your Supabase URL and Key in the source code.");
                    return;
                }

                const { data: settings, error: errS } = await supabase.from('settings').select('*').eq('id', 1).single();
                if (settings) {
                    appData.saldoAwal = settings.saldo_awal;
                }

                const { data: members, error: errM } = await supabase.from('members').select('*').order('created_at', { ascending: true });
                if (errM) throw errM;

                const { data: payments, error: errP } = await supabase.from('payments').select('*');
                if (errP) throw errP;

                appData.members = members.map(m => {
                    const mPayments = payments.filter(p => p.member_id === m.id);
                    const paymentsMap = {};
                    mPayments.forEach(p => {
                        paymentsMap[p.month] = {
                            paid: true,
                            date: p.date_text,
                            amount: p.amount
                        };
                    });
                    return {
                        id: m.id,
                        name: m.name,
                        phone: m.phone,
                        payments: paymentsMap
                    };
                });
                
                renderApp();
            } catch (e) {
                console.error("Storage error:", e);
                showToast("Gagal memuat data dari database");
            }
        }

        // Currency Formatter
        function formatRupiah(num) {
            if (num === null || num === undefined) return '0';
            return new Intl.NumberFormat('id-ID').format(num);
        }

        // Calculate totals
        function calculateTotals() {
            let totalIuranCollected = 0;
            let totalMonthsPaid = 0;
            let activeContributorsCount = 0;

            appData.members.forEach(member => {
                let memberTotal = 0;
                for (let m = 1; m <= 11; m++) {
                    const payment = member.payments && member.payments[m];
                    if (payment && payment.paid) {
                        const amount = Number(payment.amount) || STANDARD_MONTHLY_FEE;
                        memberTotal += amount;
                        totalMonthsPaid++;
                    }
                }
                member.computedTotal = memberTotal;
                totalIuranCollected += memberTotal;
                if (memberTotal > 0) activeContributorsCount++;
            });

            const grandTotalKas = (Number(appData.saldoAwal) || 0) + totalIuranCollected;

            return {
                saldoAwal: Number(appData.saldoAwal) || 0,
                totalIuranCollected,
                grandTotalKas,
                totalMonthsPaid,
                totalMembers: appData.members.length,
                activeContributorsCount
            };
        }

        // Render dashboard statistics
        function renderStats() {
            const stats = calculateTotals();
            document.getElementById('statSaldoAwal').textContent = 'Rp ' + formatRupiah(stats.saldoAwal);
            document.getElementById('statIuranMasuk').textContent = 'Rp ' + formatRupiah(stats.totalIuranCollected);
            document.getElementById('statSubTotal').textContent = 'Rp ' + formatRupiah(stats.grandTotalKas);
            document.getElementById('statTotalBulanLunas').textContent = `${stats.totalMonthsPaid} bulan tercatat`;
            document.getElementById('statTotalAnggota').textContent = `${stats.totalMembers} Keluarga`;
            document.getElementById('statPartisipasi').textContent = `${stats.activeContributorsCount} dari ${stats.totalMembers} keluarga aktif`;

            document.getElementById('tableSaldoAwal').textContent = formatRupiah(stats.saldoAwal);
            document.getElementById('tableGrandTotal').textContent = formatRupiah(stats.grandTotalKas);
        }

        // Filter helper
        function getFilteredMembers() {
            const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
            const filterStatus = document.getElementById('filterStatus')?.value || 'all';

            return appData.members.filter(m => {
                const matchesSearch = m.name.toLowerCase().includes(query);
                if (!matchesSearch) return false;

                if (filterStatus === 'paid') {
                    return (m.computedTotal || 0) > 0;
                } else if (filterStatus === 'unpaid') {
                    return (m.computedTotal || 0) === 0;
                }
                return true;
            });
        }

        // Render Main Spreadsheet Table
        function renderTable() {
            const tbody = document.getElementById('tableBody');
            const members = getFilteredMembers();
            
            if (members.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="py-8 text-center text-slate-400">
                            Tidak ada data keluarga yang sesuai dengan pencarian.
                        </td>
                    </tr>
                `;
                return;
            }

            let html = '';
            members.forEach((member, idx) => {
                const isEven = idx % 2 === 0;
                const rowBg = isEven ? 'bg-white' : 'bg-slate-50/40';

                html += `<tr class="${rowBg} hover:bg-blue-50/30 transition border-b border-slate-200 text-center">`;
                
                // Family name column
                html += `
                    <td class="py-2.5 px-3.5 sticky-col ${rowBg} text-left font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                        <div class="flex items-center justify-between group">
                            <span class="truncate cursor-pointer hover:text-blue-700" onclick="openEditFamilyModal('${member.id}')" title="Klik untuk ubah">${member.name}</span>
                            <button onclick="openEditFamilyModal('${member.id}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 ml-1 p-0.5" title="Edit Anggota">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                        </div>
                    </td>
                `;

                // 11 Months columns
                for (let m = 1; m <= 11; m++) {
                    const p = member.payments && member.payments[m];
                    const isPaid = p && p.paid;
                    const dateText = p?.date || '';
                    const isPartial = p && p.amount && p.amount < STANDARD_MONTHLY_FEE;

                    // Color theme matching the user's paper highlighting
                    let cellColor = 'bg-transparent text-slate-300 hover:bg-slate-100 cursor-pointer';
                    if (isPaid) {
                        if (isPartial) {
                            cellColor = 'bg-amber-100/90 text-amber-900 font-semibold border-amber-300 hover:bg-amber-200 cursor-pointer';
                        } else if (member.id === '9' || member.id === '11') {
                            cellColor = 'bg-orange-100/90 text-orange-900 font-medium hover:bg-orange-200 cursor-pointer';
                        } else if (member.id === '6') {
                            cellColor = 'bg-stone-100 text-stone-900 font-medium hover:bg-stone-200 cursor-pointer';
                        } else {
                            cellColor = 'bg-emerald-50/60 text-slate-800 font-medium hover:bg-emerald-100 cursor-pointer';
                        }
                    }

                    html += `
                        <td onclick="openPaymentModal('${member.id}', ${m})" class="py-2 px-1 text-[11px] border-r border-slate-200 transition ${cellColor}" title="Bulan ${MONTH_NAMES[m-1]}: Klik untuk ubah">
                            ${isPaid ? (dateText || '✓') : '<span class="text-slate-200">-</span>'}
                        </td>
                    `;
                }

                // Member Total column
                const totalDisplay = member.computedTotal > 0 ? formatRupiah(member.computedTotal) : '-';
                html += `
                    <td class="py-2.5 px-3 text-right font-black text-slate-800 ${member.computedTotal > 0 ? 'text-blue-900' : 'text-slate-400'}">
                        ${totalDisplay}
                    </td>
                `;

                html += `</tr>`;
            });

            tbody.innerHTML = html;
        }

        // Render Mobile Cards View (Optimized for Android)
        function renderCards() {
            const list = document.getElementById('cardsList');
            const members = getFilteredMembers();

            if (members.length === 0) {
                list.innerHTML = `
                    <div class="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-4">
                        Tidak ada anggota keluarga yang cocok.
                    </div>
                `;
                return;
            }

            let html = '';
            members.forEach(member => {
                const totalText = member.computedTotal > 0 ? 'Rp ' + formatRupiah(member.computedTotal) : 'Belum Ada';
                
                // count paid months
                let paidMonthsCount = 0;
                for (let m = 1; m <= 11; m++) {
                    if (member.payments && member.payments[m]?.paid) paidMonthsCount++;
                }

                html += `
                    <div class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition">
                        <div class="flex items-start justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h4 class="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                                    <span>${member.name}</span>
                                    <button onclick="openEditFamilyModal('${member.id}')" class="text-slate-400 hover:text-blue-600 p-0.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                </h4>
                                <div class="text-[11px] text-slate-400 mt-0.5">${paidMonthsCount} / 11 Bulan Terbayar</div>
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-bold ${member.computedTotal > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' : 'text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full'}">
                                    ${totalText}
                                </span>
                            </div>
                        </div>

                        <!-- Month Buttons Grid for touch devices -->
                        <div class="mt-3">
                            <div class="text-[11px] font-semibold text-slate-500 mb-1.5">Status Iuran Bulanan:</div>
                            <div class="grid grid-cols-4 gap-1.5">
                `;

                for (let m = 1; m <= 11; m++) {
                    const p = member.payments && member.payments[m];
                    const isPaid = p && p.paid;
                    const label = MONTH_NAMES[m-1];
                    const dateDesc = p?.date || (isPaid ? 'Lunas' : '');

                    let btnClass = 'bg-slate-100 text-slate-400 border-slate-200';
                    if (isPaid) {
                        if (p.amount && p.amount < STANDARD_MONTHLY_FEE) {
                            btnClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                        } else {
                            btnClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                        }
                    }

                    html += `
                        <button onclick="openPaymentModal('${member.id}', ${m})" class="p-1.5 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center ${btnClass}">
                            <span class="text-[10px] font-extrabold uppercase">${label}</span>
                            <span class="text-[9px] truncate max-w-full block leading-none mt-0.5">${isPaid ? (dateDesc || 'Lunas') : '-'}</span>
                        </button>
                    `;
                }

                html += `
                            </div>
                        </div>

                        <!-- Quick batch action -->
                        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <button onclick="quickMarkAllMonths('${member.id}')" class="text-blue-600 hover:text-blue-800 font-semibold text-[11px]">
                                + Bayar Penuh 11 Bulan
                            </button>
                            <button onclick="openEditFamilyModal('${member.id}')" class="text-slate-400 hover:text-slate-700 text-[11px]">
                                Opsi Anggota & Kontak
                            </button>
                        </div>
                    </div>
                `;
            });

            list.innerHTML = html;
        }

        function renderApp() {
            renderStats();
            renderTable();
            renderCards();
        }

        // Switch active visual layout
        function switchView(mode) {
            activeView = mode;
            const tableView = document.getElementById('tableViewContainer');
            const cardsView = document.getElementById('cardsViewContainer');
            const btnTable = document.getElementById('btnViewTable');
            const btnCards = document.getElementById('btnViewCards');

            if (mode === 'table') {
                tableView.classList.remove('hidden');
                cardsView.classList.add('hidden');
                btnTable.className = "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition bg-white text-blue-900 shadow-sm";
                btnCards.className = "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 transition";
            } else {
                tableView.classList.add('hidden');
                cardsView.classList.remove('hidden');
                btnCards.className = "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition bg-white text-blue-900 shadow-sm";
                btnTable.className = "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 transition";
            }
        }

        function handleSearch() {
            renderApp();
        }

        // Payment modal interaction
        let modalIsPaid = false;

        function openPaymentModal(memberId, monthIndex) {
            currentModalMemberId = memberId;
            currentModalMonthIndex = monthIndex;

            const member = appData.members.find(m => m.id === memberId);
            if (!member) return;

            document.getElementById('modalFamilyName').textContent = member.name;
            document.getElementById('modalMonthName').textContent = `Bulan: ${MONTH_NAMES[monthIndex-1]} 2026`;

            const current = member.payments && member.payments[monthIndex];
            modalIsPaid = !!(current && current.paid);

            const dateInput = document.getElementById('modalDateInput');
            const amountInput = document.getElementById('modalAmountInput');

            if (current && current.paid) {
                dateInput.value = current.date || '';
                amountInput.value = current.amount || STANDARD_MONTHLY_FEE;
            } else {
                const now = new Date();
                dateInput.value = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear().toString().slice(-2)}`;
                amountInput.value = STANDARD_MONTHLY_FEE;
            }

            updateModalStatusUI();
            openModal('paymentModal');
        }

        function setModalPaymentStatus(isPaid) {
            modalIsPaid = isPaid;
            updateModalStatusUI();
        }

        function setModalAmount(val) {
            document.getElementById('modalAmountInput').value = val;
            if (val === 10000) {
                document.getElementById('modalDateInput').value = '10rb';
            } else if (val === 15000) {
                document.getElementById('modalDateInput').value = '15rb';
            }
        }

        function updateModalStatusUI() {
            const btnPaid = document.getElementById('btnStatusPaid');
            const btnUnpaid = document.getElementById('btnStatusUnpaid');
            const fields = document.getElementById('paidFieldsContainer');

            if (modalIsPaid) {
                btnPaid.className = 'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition bg-emerald-600 text-white border-emerald-700 shadow-sm';
                btnUnpaid.className = 'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition bg-slate-50 text-slate-600 border-slate-200';
                fields.classList.remove('hidden');
            } else {
                btnUnpaid.className = 'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition bg-rose-600 text-white border-rose-700 shadow-sm';
                btnPaid.className = 'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition bg-slate-50 text-slate-600 border-slate-200';
                fields.classList.add('hidden');
            }
        }

        async function savePaymentModal() {
            const member = appData.members.find(m => m.id === currentModalMemberId);
            if (!member) return;

            if (!member.payments) member.payments = {};
            
            try {
                if (modalIsPaid) {
                    const dateVal = document.getElementById('modalDateInput').value.trim() || 'Lunas';
                    const amtVal = Number(document.getElementById('modalAmountInput').value) || STANDARD_MONTHLY_FEE;
                    
                    const { error } = await supabase.from('payments').upsert({
                        member_id: member.id,
                        month: currentModalMonthIndex,
                        amount: amtVal,
                        date_text: dateVal
                    }, { onConflict: 'member_id, month' });

                    if(error) throw error;
                    
                    member.payments[currentModalMonthIndex] = {
                        paid: true,
                        date: dateVal,
                        amount: amtVal
                    };
                } else {
                    const { error } = await supabase.from('payments')
                        .delete()
                        .match({ member_id: member.id, month: currentModalMonthIndex });
                    if(error) throw error;
                    
                    delete member.payments[currentModalMonthIndex];
                }

                renderApp();
                closeModal('paymentModal');
                showToast('Data pembayaran berhasil diperbarui');
            } catch (e) {
                console.error(e);
                showToast('Gagal menyimpan ke database!');
            }
        }

        // Quick batch pay all 11 months
        async function quickMarkAllMonths(memberId) {
            const member = appData.members.find(m => m.id === memberId);
            if (!member) return;

            const now = new Date();
            const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear().toString().slice(-2)}`;

            if (!member.payments) member.payments = {};
            
            const records = [];
            for (let m = 1; m <= 11; m++) {
                records.push({
                    member_id: member.id,
                    month: m,
                    amount: STANDARD_MONTHLY_FEE,
                    date_text: dateStr
                });
            }

            try {
                const { error } = await supabase.from('payments').upsert(records, { onConflict: 'member_id, month' });
                if (error) throw error;

                for (let m = 1; m <= 11; m++) {
                    member.payments[m] = { paid: true, date: dateStr, amount: STANDARD_MONTHLY_FEE };
                }

                renderApp();
                showToast(`11 Bulan berhasil dicatat untuk ${member.name}`);
            } catch (e) {
                console.error(e);
                showToast('Gagal memproses batch!');
            }
        }

        // Add / Edit Member Modal
        function openAddFamilyModal() {
            document.getElementById('familyModalTitle').textContent = 'Tambah Anggota Keluarga Baru';
            document.getElementById('editFamilyId').value = '';
            document.getElementById('inputFamilyName').value = '';
            document.getElementById('inputFamilyPhone').value = '';
            document.getElementById('btnDeleteFamily').classList.add('hidden');
            document.getElementById('quickMonthsBlock').classList.remove('hidden');

            const boxContainer = document.getElementById('familyMonthCheckboxes');
            let cbHtml = '';
            MONTH_NAMES.forEach((mName, idx) => {
                cbHtml += `
                    <label class="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" name="quickMonth" value="${idx+1}" class="rounded text-blue-600">
                        <span>${mName}</span>
                    </label>
                `;
            });
            boxContainer.innerHTML = cbHtml;

            openModal('familyModal');
        }

        function openEditFamilyModal(memberId) {
            const member = appData.members.find(m => m.id === memberId);
            if (!member) return;

            document.getElementById('familyModalTitle').textContent = 'Edit Anggota Keluarga';
            document.getElementById('editFamilyId').value = member.id;
            document.getElementById('inputFamilyName').value = member.name;
            document.getElementById('inputFamilyPhone').value = member.phone || '';
            document.getElementById('btnDeleteFamily').classList.remove('hidden');
            document.getElementById('quickMonthsBlock').classList.add('hidden');

            openModal('familyModal');
        }

        async function handleSaveFamily(e) {
            e.preventDefault();
            const id = document.getElementById('editFamilyId').value;
            const name = document.getElementById('inputFamilyName').value.trim();
            const phone = document.getElementById('inputFamilyPhone').value.trim();

            if (!name) return;

            try {
                if (id) {
                    const { error } = await supabase.from('members').update({ name, phone }).eq('id', id);
                    if (error) throw error;
                    
                    const member = appData.members.find(m => m.id === id);
                    if (member) {
                        member.name = name;
                        member.phone = phone;
                    }
                    showToast('Data anggota diperbarui');
                } else {
                    const newId = Date.now().toString();
                    
                    const { error: err1 } = await supabase.from('members').insert([{ id: newId, name, phone }]);
                    if (err1) throw err1;

                    const checkedBoxes = document.querySelectorAll('input[name="quickMonth"]:checked');
                    const now = new Date();
                    const todayStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear().toString().slice(-2)}`;

                    const newMember = {
                        id: newId,
                        name: name,
                        phone: phone,
                        payments: {}
                    };

                    if (checkedBoxes.length > 0) {
                        const paymentsToInsert = [];
                        checkedBoxes.forEach(cb => {
                            const m = Number(cb.value);
                            paymentsToInsert.push({ member_id: newId, month: m, amount: STANDARD_MONTHLY_FEE, date_text: todayStr });
                            newMember.payments[m] = { paid: true, date: todayStr, amount: STANDARD_MONTHLY_FEE };
                        });
                        const { error: err2 } = await supabase.from('payments').insert(paymentsToInsert);
                        if(err2) throw err2;
                    }

                    appData.members.push(newMember);
                    showToast('Anggota baru berhasil ditambahkan');
                }
                
                renderApp();
                closeModal('familyModal');
            } catch (e) {
                console.error(e);
                showToast("Gagal menyimpan data ke database");
            }
        }

        async function handleDeleteFamily() {
            const id = document.getElementById('editFamilyId').value;
            if (!id) return;

            const member = appData.members.find(m => m.id === id);
            const memberName = member ? member.name : 'Anggota ini';

            if (window.confirm(`Hapus ${memberName} dari daftar kas keluarga?`)) {
                try {
                    const { error } = await supabase.from('members').delete().eq('id', id);
                    if (error) throw error;
                    
                    appData.members = appData.members.filter(m => m.id !== id);
                    renderApp();
                    closeModal('familyModal');
                    showToast('Anggota telah dihapus');
                } catch (e) {
                    console.error(e);
                    showToast('Gagal menghapus dari database');
                }
            }
        }

        // Saldo Awal Editor
        function openEditSaldoAwalModal() {
            document.getElementById('inputSaldoAwal').value = appData.saldoAwal || 0;
            openModal('saldoModal');
        }

        async function saveSaldoAwal() {
            const val = Number(document.getElementById('inputSaldoAwal').value) || 0;
            try {
                const { error } = await supabase.from('settings').upsert({ id: 1, saldo_awal: val });
                if(error) throw error;
                
                appData.saldoAwal = val;
                renderApp();
                closeModal('saldoModal');
                showToast('Sisa saldo kas berhasil disimpan');
            } catch (e) {
                console.error(e);
                showToast('Gagal update saldo awal');
            }
        }

        // Copy BCA Number
        function copyBcaNumber() {
            const temp = document.createElement('textarea');
            temp.value = '0440876757';
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('Nomor Rekening BCA 0440876757 disalin');
        }

        // WhatsApp Report Generator
        function openShareWhatsAppModal() {
            const stats = calculateTotals();
            let msg = `*LAPORAN IURAN KAS KELUARGA BOETJE ETTY SALHUTERU 2026*\n`;
            msg += `_Per Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}_\n\n`;
            msg += `💰 *Sisa Saldo 2025:* Rp ${formatRupiah(stats.saldoAwal)}\n`;
            msg += `📥 *Iuran Terkumpul 2026:* Rp ${formatRupiah(stats.totalIuranCollected)}\n`;
            msg += `🏦 *TOTAL KAS SEKARANG:* Rp ${formatRupiah(stats.grandTotalKas)}\n\n`;
            msg += `📋 *RINCIAN IURAN ANGGOTA:*\n`;

            appData.members.forEach((m, idx) => {
                let paidMonthsList = [];
                for (let mon = 1; mon <= 11; mon++) {
                    if (m.payments && m.payments[mon]?.paid) {
                        paidMonthsList.push(MONTH_NAMES[mon-1]);
                    }
                }

                const totalStr = m.computedTotal > 0 ? `Rp ${formatRupiah(m.computedTotal)}` : 'Belum Ada';
                const monthsStr = paidMonthsList.length > 0 ? `(${paidMonthsList.join(', ')})` : '(Belum bayar)';
                msg += `${idx+1}. *${m.name}* : ${totalStr} ${monthsStr}\n`;
            });

            msg += `\n💳 *Info Transfer:*\n`;
            msg += `BCA: 0440876757\n`;
            msg += `a.n. Pricilia Linda Salhuteru\n`;
            msg += `Iuran: Rp 20.000 / bulan\n\n`;
            msg += `_Terima kasih atas kebersamaan & partisipasi seluruh keluarga._ 🙏`;

            document.getElementById('waMessageText').value = msg;
            
            const encoded = encodeURIComponent(msg);
            document.getElementById('btnSendWaDirect').href = `https://api.whatsapp.com/send?text=${encoded}`;

            openModal('shareModal');
        }

        function copyWaMessage() {
            const el = document.getElementById('waMessageText');
            el.select();
            document.execCommand('copy');
            showToast('Laporan disalin! Buka WhatsApp untuk paste');
        }

        // Export to CSV / Excel
        function exportToCsv() {
            const stats = calculateTotals();
            let csvContent = "data:text/csv;charset=utf-8,";
            
            // Header
            csvContent += "IURAN KELUARGA BOETJE ETTY SALHUTERU 2026\r\n";
            csvContent += "KELUARGA,JAN,FEB,MARET,APRIL,MEI,JUNI,JULI,AUG,SEPT,OKT,NOV,TOTAL\r\n";
            csvContent += `Sisa Saldo per 31 Des 25,,,,,,,,,,,,"${stats.saldoAwal}"\r\n`;

            appData.members.forEach(m => {
                let row = `"${m.name}"`;
                for (let i = 1; i <= 11; i++) {
                    const p = m.payments && m.payments[i];
                    row += `,"${p && p.paid ? (p.date || 'Lunas') : ''}"`;
                }
                row += `,"${m.computedTotal || 0}"\r\n`;
            });

            csvContent += `Sub Total,,,,,,,,,,,,"${stats.grandTotalKas}"\r\n`;

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Iuran_Keluarga_Boetje_Etty_Salhuteru_2026.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('File CSV berhasil diunduh');
        }

        // PWA Setup
        function setupPwaManifest() {
            const manifestObj = {
                "name": "Iuran Kas Keluarga Salhuteru 2026",
                "short_name": "Iuran 2026",
                "description": "Pencatatan Iuran Keluarga Boetje Etty Salhuteru 2026",
                "start_url": "./",
                "display": "standalone",
                "background_color": "#1e3a8a",
                "theme_color": "#1e3a8a",
                "icons": [
                    {
                        "src": "https://placehold.co/192x192/1e3a8a/ffffff.png?text=Iuran+2026",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "https://placehold.co/512x512/1e3a8a/ffffff.png?text=Iuran+2026",
                        "sizes": "512x512",
                        "type": "image/png"
                    }
                ]
            };
            const stringManifest = JSON.stringify(manifestObj);
            const blob = new Blob([stringManifest], {type: 'application/json'});
            const manifestURL = URL.createObjectURL(blob);
            const linkTag = document.createElement('link');
            linkTag.rel = 'manifest';
            linkTag.href = manifestURL;
            document.head.appendChild(linkTag);
        }

        // Listen for PWA beforeinstallprompt on Android/Chrome
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.classList.remove('hidden');
        });

        function handlePwaInstallPrompt() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        showToast('Aplikasi sedang diinstall ke ponsel Android');
                    }
                    deferredPrompt = null;
                });
            } else {
                showToast('Di Android, ketuk Menu (⋮) browser lalu "Tambahkan ke Layar Utama"');
            }
        }

        // UI Utility Modals & Toasts
        function openModal(modalId) {
            document.getElementById(modalId)?.classList.remove('hidden');
        }

        function closeModal(modalId) {
            document.getElementById(modalId)?.classList.add('hidden');
        }

        function showToast(msg) {
            const toast = document.getElementById('toastNotification');
            const toastMsg = document.getElementById('toastMsg');
            toastMsg.textContent = msg;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }

        // Auto-switch view to Cards on small mobile screens
        function checkScreenSize() {
            if (window.innerWidth < 640) {
                switchView('cards');
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            loadStorage();
            setupPwaManifest();
            checkScreenSize();
        });
    
