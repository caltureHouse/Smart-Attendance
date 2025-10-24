// System Configuration
const SYSTEM_CONFIG = {
    cities: ['الدمام', 'الرياض', 'جيزان', 'نجران', 'حايل', 'احد رفيده', 'بريدة', 'سكاكا'],
    adminCredentials: {
        username: 'admin',
        password: 'admin123456'
    },
    defaultData: [
        {
            id: 1,
            city: "الدمام",
            name: "محمد أحمد",
            phone: "0512345678",
            type: "متطوع",
            opportunityType: "توزيع مواد غذائية",
            checkIn: "2023-06-15 08:30:00",
            checkOut: "2023-06-15 16:45:00"
        },
        {
            id: 2,
            city: "الرياض",
            name: "أحمد علي",
            phone: "0556789123",
            type: "متدرب",
            checkIn: "2023-06-15 09:15:00",
            checkOut: null
        }
    ]
};

let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || SYSTEM_CONFIG.defaultData;

document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

function initializeApplication() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Check city selection
    const selectedCity = localStorage.getItem('selectedCity');
    if (!selectedCity) {
        window.location.href = 'city-selection.html';
        return;
    }
    
    // Update welcome title
    document.getElementById('welcome-title').textContent = `نظام الحضور - ${selectedCity}`;
    
    // Initialize event listeners
    setupEventListeners();
    
    // Show welcome screen
    showScreen('welcome-screen');
}

function setupEventListeners() {
    // User type change
    document.getElementById('user-type').addEventListener('change', function() {
        const opportunityField = document.getElementById('opportunity-type-container');
        if (this.value === 'متطوع') {
            opportunityField.style.display = 'block';
            document.getElementById('opportunity-type').required = true;
        } else {
            opportunityField.style.display = 'none';
            document.getElementById('opportunity-type').required = false;
            document.getElementById('opportunity-type').value = '';
        }
    });
    
    // Check-in form
    document.getElementById('checkin-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processCheckIn();
    });
    
    // Check-out form
    document.getElementById('checkout-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processCheckOut();
    });
    
    // Admin login
    document.getElementById('admin-form').addEventListener('submit', function(e) {
        e.preventDefault();
        adminLogin();
    });
    
    // City filter
    document.getElementById('city-filter').addEventListener('change', function() {
        filterRecords();
    });
    
    // Date filter
    document.getElementById('date-filter').addEventListener('change', function() {
        filterRecords();
    });
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        
        // Special handling for admin screen
        if (screenId === 'admin-screen') {
            const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
            document.querySelector('.admin-login').style.display = isLoggedIn ? 'none' : 'block';
            document.getElementById('admin-dashboard').style.display = isLoggedIn ? 'block' : 'none';
            
            if (isLoggedIn) {
                initializeAdminPanel();
            }
        }
    }
}

// Check-in Process
function processCheckIn() {
    showLoading(true);
    
    const selectedCity = localStorage.getItem('selectedCity');
    const name = document.getElementById('checkin-name').value.trim();
    const phone = document.getElementById('checkin-phone').value.trim();
    const type = document.getElementById('user-type').value;
    const opportunityType = type === 'متطوع' ? document.getElementById('opportunity-type').value.trim() : null;
    
    // Validation
    if (!name || !phone || !type) {
        showAlert('الرجاء إدخال جميع البيانات المطلوبة', 'error');
        showLoading(false);
        return;
    }
    
    if (!/^05\d{8}$/.test(phone)) {
        showAlert('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام', 'error');
        showLoading(false);
        return;
    }
    
    if (type === 'متطوع' && !opportunityType) {
        showAlert('الرجاء إدخال نوع الفرصة التطوعية', 'error');
        showLoading(false);
        return;
    }
    
    // Check for existing check-in
    const today = new Date().toISOString().split('T')[0];
    const alreadyCheckedIn = attendanceData.some(record => 
        record.phone === phone && 
        record.city === selectedCity &&
        record.checkIn && 
        record.checkIn.startsWith(today) && 
        !record.checkOut
    );
    
    if (alreadyCheckedIn) {
        showAlert('هذا الرقم مسجل بالفعل اليوم ولم يسجل خروج', 'error');
        showLoading(false);
        return;
    }
    
    // Create new record
    const newRecord = {
        id: attendanceData.length > 0 ? Math.max(...attendanceData.map(r => r.id)) + 1 : 1,
        city: selectedCity,
        name: name,
        phone: phone,
        type: type,
        opportunityType: opportunityType,
        checkIn: getCurrentDateTime(),
        checkOut: null
    };
    
    attendanceData.push(newRecord);
    saveData();
    
    // Reset form
    document.getElementById('checkin-form').reset();
    document.getElementById('user-type').value = '';
    document.getElementById('opportunity-type-container').style.display = 'none';
    
    showAlert(`تم تسجيل حضور ${name} بنجاح`);
    showScreen('welcome-screen');
    showLoading(false);
}

// Check-out Process
function processCheckOut() {
    showLoading(true);
    
    const selectedCity = localStorage.getItem('selectedCity');
    const phone = document.getElementById('checkout-phone').value.trim();
    
    // Validation
    if (!phone) {
        showAlert('الرجاء إدخال رقم الجوال', 'error');
        showLoading(false);
        return;
    }
    
    // Find record
    const today = new Date().toISOString().split('T')[0];
    const recordIndex = attendanceData.findIndex(record => 
        record.phone === phone && 
        record.city === selectedCity &&
        record.checkIn && 
        record.checkIn.startsWith(today) && 
        !record.checkOut
    );
    
    if (recordIndex === -1) {
        showAlert('لا يوجد حضور مسجل لهذا الرقم أو تم تسجيل الخروج مسبقاً', 'error');
        showLoading(false);
        return;
    }
    
    // Update record
    attendanceData[recordIndex].checkOut = getCurrentDateTime();
    saveData();
    
    // Reset form
    document.getElementById('checkout-form').reset();
    showAlert(`تم تسجيل خروج ${attendanceData[recordIndex].name} بنجاح`);
    showScreen('welcome-screen');
    showLoading(false);
}

// Admin Functions
function adminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    
    if (username === SYSTEM_CONFIG.adminCredentials.username && password === SYSTEM_CONFIG.adminCredentials.password) {
        localStorage.setItem('adminLoggedIn', 'true');
        document.querySelector('.admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initializeAdminPanel();
        showAlert('تم الدخول بنجاح إلى لوحة التحكم', 'success');
    } else {
        showAlert('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        document.getElementById('admin-form').classList.add('shake');
        setTimeout(() => document.getElementById('admin-form').classList.remove('shake'), 500);
    }
}

function logoutAdmin() {
    localStorage.removeItem('adminLoggedIn');
    document.querySelector('.admin-login').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-form').reset();
    showAlert('تم تسجيل الخروج بنجاح', 'success');
    showScreen('welcome-screen');
}

function initializeAdminPanel() {
    // Populate city filter
    const cityFilter = document.getElementById('city-filter');
    cityFilter.innerHTML = '<option value="all">جميع الفروع</option>';
    
    SYSTEM_CONFIG.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-filter').value = today;
    
    // Load initial data
    filterRecords();
}

function filterRecords() {
    const cityFilter = document.getElementById('city-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let filteredData = attendanceData;
    
    // Filter by city
    if (cityFilter !== 'all') {
        filteredData = filteredData.filter(record => record.city === cityFilter);
    }
    
    // Filter by date
    if (dateFilter) {
        filteredData = filteredData.filter(record => 
            record.checkIn && record.checkIn.startsWith(dateFilter)
        );
    }
    
    // Update stats
    updateStats(filteredData, dateFilter);
    
    // Update table
    updateTable(filteredData.reverse());
}

function updateStats(filteredData, dateFilter) {
    const presentCount = filteredData.length;
    const absentCount = filteredData.filter(record => !record.checkOut).length;
    
    // Calculate total count based on filters
    let totalCount = attendanceData.length;
    
    if (dateFilter) {
        totalCount = attendanceData.filter(record => 
            record.checkIn && record.checkIn.startsWith(dateFilter)
        ).length;
    }
    
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
    document.getElementById('total-count').textContent = totalCount;
}

function updateTable(data) {
    const tableBody = document.querySelector('#attendance-table tbody');
    tableBody.innerHTML = '';
    
    data.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.city}</td>
            <td>${record.name}</td>
            <td>${record.phone}</td>
            <td>${formatVolunteerType(record.type, record.opportunityType)}</td>
            <td>${formatGregorianDateTime(record.checkIn)}</td>
            <td>${record.checkOut ? formatGregorianDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
            <td>${calculateDuration(record.checkIn, record.checkOut)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteRecord(${record.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Format volunteer type display
function formatVolunteerType(type, opportunityType) {
    if (type === 'متطوع') {
        return ` متطوع - ${opportunityType || 'غير محدد'}`;
    }
    return `${type} - `;
}

// Format date in Gregorian calendar always
function formatGregorianDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const dateTime = new Date(dateTimeString);
    
    // Format time (12-hour format with AM/PM)
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Format date (Gregorian)
    const day = dateTime.getDate();
    const month = dateTime.getMonth() + 1;
    const year = dateTime.getFullYear();
    const formattedDate = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    
    return `${formattedDate} ${formattedTime}`;
}

// Data Export
function exportToExcel() {
    showLoading(true);
    
    const cityFilter = document.getElementById('city-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let data = attendanceData;
    
    // Filter by city
    if (cityFilter !== 'all') {
        data = data.filter(record => record.city === cityFilter);
    }
    
    // Filter by date
    if (dateFilter) {
        data = data.filter(record => 
            record.checkIn && record.checkIn.startsWith(dateFilter)
        );
    }
    
    if (data.length === 0) {
        showAlert('لا توجد بيانات لتصديرها', 'error');
        showLoading(false);
        return;
    }
    
    // Generate CSV
    let csv = 'الفرع,الاسم,رقم الجوال,النوع,وقت الدخول,وقت الخروج,المدة\n';
    
    data.forEach(record => {
        csv += `"${record.city}","${record.name}","${record.phone}",`;
        csv += `"${formatVolunteerType(record.type, record.opportunityType)}",`;
        csv += `"${formatGregorianDateTime(record.checkIn)}",`;
        csv += `"${record.checkOut ? formatGregorianDateTime(record.checkOut) : 'لم يخرج بعد'}",`;
        csv += `"${calculateDuration(record.checkIn, record.checkOut)}"\n`;
    });
    
    // Create download
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `حضور_${cityFilter === 'all' ? 'جميع_الفروع' : cityFilter}_${dateFilter || 'كافة_التواريخ'}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showAlert('تم تصدير البيانات إلى Excel بنجاح', 'success');
        showLoading(false);
    }, 100);
}

function exportToPDF() {
    showLoading(true);
    
    const cityFilter = document.getElementById('city-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let data = attendanceData;
    
    // Filter by city
    if (cityFilter !== 'all') {
        data = data.filter(record => record.city === cityFilter);
    }
    
    // Filter by date
    if (dateFilter) {
        data = data.filter(record => 
            record.checkIn && record.checkIn.startsWith(dateFilter)
        );
    }
    
    if (data.length === 0) {
        showAlert('لا توجد بيانات لتصديرها', 'error');
        showLoading(false);
        return;
    }
    
    // Create PDF content
    let pdfContent = `
        <html>
        <head>
            <title>تقرير الحضور</title>
            <style>
                body { font-family: 'Tajawal', sans-serif; direction: rtl; }
                h1 { text-align: center; color: #36E39B; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #36E39B; color: white; padding: 10px; text-align: right; }
                td { padding: 8px; border-bottom: 1px solid #ddd; text-align: right; }
                .header { text-align: center; margin-bottom: 20px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير الحضور</h1>
                <p>${cityFilter === 'all' ? 'جميع الفروع' : 'فرع ' + cityFilter} | ${dateFilter || 'كافة التواريخ'}</p>
                <p>تاريخ التقرير: ${formatGregorianDateTime(getCurrentDateTime())}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>الفرع</th>
                        <th>الاسم</th>
                        <th>رقم الجوال</th>
                        <th>النوع</th>
                        <th>وقت الدخول</th>
                        <th>وقت الخروج</th>
                        <th>المدة</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach(record => {
        pdfContent += `
            <tr>
                <td>${record.city}</td>
                <td>${record.name}</td>
                <td>${record.phone}</td>
                <td>${formatVolunteerType(record.type, record.opportunityType)}</td>
                <td>${formatGregorianDateTime(record.checkIn)}</td>
                <td>${record.checkOut ? formatGregorianDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
                <td>${calculateDuration(record.checkIn, record.checkOut)}</td>
            </tr>
        `;
    });
    
    pdfContent += `
                </tbody>
            </table>
            <div class="footer">
                <p>تم إنشاء التقرير بواسطة نظام الحضور الذكي</p>
                <p>${new Date().getFullYear()} © جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
    
    // Open print dialog which can be saved as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
        printWindow.print();
        showLoading(false);
    };
    
    showAlert('تم فتح نافذة الطباعة، يمكنك حفظ التقرير كـ PDF', 'success');
}

// Data Management
function saveData() {
    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
}

function resetData() {
    if (confirm('هل أنت متأكد من رغبتك في حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
        attendanceData = [];
        saveData();
        filterRecords();
        showAlert('تم حذف جميع البيانات بنجاح', 'success');
    }
}

function deleteRecord(id) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        attendanceData = attendanceData.filter(record => record.id !== id);
        saveData();
        filterRecords();
        showAlert('تم حذف السجل بنجاح', 'success');
    }
}

// Utility Functions
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function calculateDuration(checkIn, checkOut) {
    if (!checkOut) return 'لم يخرج بعد';
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    
    const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
    
    return `${diffHrs} ساعات و ${diffMins} دقائق`;
}

function showAlert(message, type = 'success') {
    const alert = document.getElementById('alert-message');
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, type === 'error' ? 5000 : 3000);
}

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}
