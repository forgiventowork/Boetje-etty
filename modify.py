import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add Supabase CDN
head_tag_injection = '''    <!-- Supabase JS -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
'''
html = html.replace('<!-- Tailwind CSS -->', head_tag_injection + '    <!-- Tailwind CSS -->')

# Now for the JS block
# We will match from         // Initial Data directly extracted down to         function loadStorage()
js_pattern = re.compile(r'        // Initial Data directly extracted.*?        function loadStorage\(\) \{.*?\}\n', re.DOTALL)

replacement_js = '''
        const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
        const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        let activeView = 'table';
        let currentModalMemberId = null;
        let currentModalMonthIndex = null;
        let deferredPrompt = null;

        async function loadData() {
            try {
                if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
                    console.warn("Please configure Supabase URL and Key");
                    return;
                }
                const { data: settings } = await supabase.from('settings').select('*').single();
                if (settings) appData.saldoAwal = settings.saldo_awal;

                const { data: members, error: errM } = await supabase.from('members').select('*').order('created_at', {ascending: true});
                if (errM) throw errM;

                const { data: payments, error: errP } = await supabase.from('payments').select('*');
                if (errP) throw errP;

                appData.members = members.map(m => {
                    const mPayments = payments.filter(p => p.member_id === m.id);
                    const paymentsMap = {};
                    mPayments.forEach(p => {
                        paymentsMap[p.month] = { paid: true, date: p.date_text, amount: p.amount };
                    });
                    return { id: m.id, name: m.name, phone: m.phone, payments: paymentsMap };
                });
                renderApp();
            } catch (e) {
                console.error("Storage error:", e);
                showToast("Gagal memuat data");
            }
        }
'''

html = js_pattern.sub(replacement_js, html)

# Replace saveStorage
html = html.replace('''        function saveStorage() {
            try {
                localStorage.setItem('SALHUTERU_IURAN_2026_DATA', JSON.stringify(appData));
            } catch (e) {
                console.error("Save error:", e);
            }
        }''', '')

# We need to replace all saveStorage() calls inside savePaymentModal, quickMarkAllMonths, handleSaveFamily, handleDeleteFamily, saveSaldoAwal
# And change them to async where appropriate, or just handle Supabase API directly in those functions.
# Let's replace the bodies of those functions.

with open('modify.py', 'w') as out:
    out.write("print('doing it in next step')")

with open('index_modified.html', 'w', encoding='utf-8') as f:
    f.write(html)
