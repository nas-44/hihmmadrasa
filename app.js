// --- CONFIG & STATE ---
const DB_KEY = 'school_sys_v1';
let currentUser = null;
let currentRole = 'admin'; // Default login tab

// --- INIT ---
window.onload = () => {
    // Initialize DB if empty
    if (!localStorage.getItem(DB_KEY)) {
        const initData = { 
            users: [{ id: 'u1', name: 'Admin User', role: 'admin', username: 'admin', password: '123' }],
            classes: [], // { id, name, subjects: [] }
            assignments: [], // { classId, teacherId }
            students: [], // { id, name, rollNo, classId, dob, ... }
            attendance: [], // { date, classId, studentId, status }
            results: [] // { examName, classId, studentId, marks: { sub: score } }
        };
        localStorage.setItem(DB_KEY, JSON.stringify(initData));
    }
    // Check Session
    const session = sessionStorage.getItem('school_session');
    if (session) {
        currentUser = JSON.parse(session);
        showDashboard(currentUser.role);
    }
};

function getDB() { return JSON.parse(localStorage.getItem(DB_KEY)); }
function saveDB(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
function generateId() { return '_' + Math.random().toString(36).substr(2, 9); }
function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `p-3 rounded shadow text-white text-sm font-bold ${type==='success'?'bg-green-600':'bg-red-600'} animate-bounce`;
    div.innerText = msg;
    document.getElementById('toast-container').appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// --- AUTH ---
function setLoginRole(role) {
    currentRole = role;
    ['admin', 'teacher', 'student'].forEach(r => {
        const btn = document.getElementById(`tab-${r}`);
        if (r === role) {
            btn.className = "flex-1 py-2 rounded-md text-sm font-bold transition bg-white shadow text-indigo-600";
        } else {
            btn.className = "flex-1 py-2 rounded-md text-sm font-bold text-gray-500 hover:text-gray-700 transition";
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('login-id').value;
    const pass = document.getElementById('login-pass').value;
    const db = getDB();
    
    let user;
    if (currentRole === 'student') {
        // Students login with RollNo (username) + Password
        user = db.students.find(s => s.rollNo === id && s.password === pass);
        if(user) user.role = 'student';
    } else {
        // Admin/Teacher
        user = db.users.find(u => u.username === id && u.password === pass && u.role === currentRole);
    }

    if (user) {
        currentUser = user;
        sessionStorage.setItem('school_session', JSON.stringify(user));
        showDashboard(currentRole);
    } else {
        showToast("Invalid Credentials", "error");
    }
}

function logout() {
    sessionStorage.removeItem('school_session');
    window.location.reload();
}

function showDashboard(role) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById(`view-${role}`).classList.remove('hidden');
    
    if (role === 'admin') adminTab('overview');
    if (role === 'teacher') initTeacherDash();
    if (role === 'student') initStudentDash();
}

// ==================== ADMIN MODULE ====================
function adminTab(tab) {
    const content = document.getElementById('admin-content');
    const db = getDB();
    
    if (tab === 'overview') {
        const sCount = db.students.length;
        const tCount = db.users.filter(u => u.role === 'teacher').length;
        const cCount = db.classes.length;
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-blue-100"><h3 class="text-gray-500 text-xs uppercase font-bold">Total Students</h3><p class="text-4xl font-bold text-blue-600">${sCount}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-green-100"><h3 class="text-gray-500 text-xs uppercase font-bold">Teachers</h3><p class="text-4xl font-bold text-green-600">${tCount}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-purple-100"><h3 class="text-gray-500 text-xs uppercase font-bold">Classes</h3><p class="text-4xl font-bold text-purple-600">${cCount}</p></div>
            </div>`;
    } 
    else if (tab === 'classes') {
        let html = `<div class="flex justify-between mb-4"><h3 class="font-bold text-lg">Manage Classes</h3><button onclick="openModal('addClass')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Add Class</button></div><div class="grid gap-4">`;
        db.classes.forEach(c => {
            html += `<div class="bg-white p-4 rounded border flex justify-between items-center"><div><h4 class="font-bold">${c.name}</h4><p class="text-xs text-gray-500">Subjects: ${c.subjects.join(', ')}</p></div><button onclick="openModal('addSubject', '${c.id}')" class="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">Add Subject</button></div>`;
        });
        content.innerHTML = html + '</div>';
    }
    else if (tab === 'teachers') {
        let html = `<div class="flex justify-between mb-4"><h3 class="font-bold text-lg">Teachers</h3><button onclick="openModal('addTeacher')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Add Teacher</button></div><table class="w-full bg-white rounded shadow text-sm"><thead class="bg-gray-50"><tr><th class="p-3 text-left">Name</th><th class="p-3 text-left">Username</th><th class="p-3 text-left">Assigned Class</th></tr></thead><tbody>`;
        const teachers = db.users.filter(u => u.role === 'teacher');
        teachers.forEach(t => {
            // Find assigned class
            const assign = db.assignments.find(a => a.teacherId === t.id);
            const className = assign ? db.classes.find(c => c.id === assign.classId)?.name : 'None';
            html += `<tr class="border-b"><td class="p-3">${t.name}</td><td class="p-3">${t.username}</td><td class="p-3"><button onclick="openModal('assignClass', '${t.id}')" class="text-blue-600 underline">${className}</button></td></tr>`;
        });
        content.innerHTML = html + '</tbody></table>';
    }
    else if (tab === 'students') {
        const classes = db.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        content.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow mb-6">
                <h3 class="font-bold mb-4">Register Student</h3>
                <div class="grid grid-cols-2 gap-4">
                    <input id="new-stu-name" placeholder="Full Name" class="border p-2 rounded">
                    <input id="new-stu-roll" placeholder="Roll Number (Login ID)" class="border p-2 rounded">
                    <input id="new-stu-pass" placeholder="Password" class="border p-2 rounded">
                    <select id="new-stu-class" class="border p-2 rounded bg-white"><option value="">Select Class</option>${classes}</select>
                </div>
                <button onclick="addStudent()" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded font-bold w-full">Register Student</button>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="font-bold mb-2">Student Directory</h3>
                <div id="admin-stu-list" class="max-h-64 overflow-y-auto text-sm"></div>
            </div>`;
        renderAdminStudentList();
    }
}

function renderAdminStudentList() {
    const db = getDB();
    const div = document.getElementById('admin-stu-list');
    if (!div) return;
    let html = `<table class="w-full text-left"><thead class="bg-gray-50"><tr><th class="p-2">Roll</th><th class="p-2">Name</th><th class="p-2">Class</th></tr></thead><tbody>`;
    db.students.forEach(s => {
        const cName = db.classes.find(c => c.id === s.classId)?.name || 'Unknown';
        html += `<tr class="border-b"><td class="p-2">${s.rollNo}</td><td class="p-2">${s.name}</td><td class="p-2">${cName}</td></tr>`;
    });
    div.innerHTML = html + '</tbody></table>';
}

// --- ADMIN ACTIONS ---
function addClass() {
    const name = document.getElementById('inp-class-name').value;
    if(!name) return;
    const db = getDB();
    db.classes.push({ id: generateId(), name, subjects: [] });
    saveDB(db); closeModal(); adminTab('classes');
}
function addSubject(classId) {
    const name = document.getElementById('inp-sub-name').value;
    if(!name) return;
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if(cls) cls.subjects.push(name);
    saveDB(db); closeModal(); adminTab('classes');
}
function addTeacher() {
    const name = document.getElementById('inp-teach-name').value;
    const user = document.getElementById('inp-teach-user').value;
    const pass = document.getElementById('inp-teach-pass').value;
    if(!name || !user) return;
    const db = getDB();
    db.users.push({ id: generateId(), name, role: 'teacher', username: user, password: pass });
    saveDB(db); closeModal(); adminTab('teachers');
}
function assignClass(teacherId) {
    const classId = document.getElementById('inp-assign-class').value;
    const db = getDB();
    // Remove old assignment
    db.assignments = db.assignments.filter(a => a.teacherId !== teacherId);
    if(classId) db.assignments.push({ teacherId, classId });
    saveDB(db); closeModal(); adminTab('teachers');
}
function addStudent() {
    const name = document.getElementById('new-stu-name').value;
    const roll = document.getElementById('new-stu-roll').value;
    const pass = document.getElementById('new-stu-pass').value;
    const cls = document.getElementById('new-stu-class').value;
    if(!name || !roll || !cls) return showToast('Missing fields', 'error');
    const db = getDB();
    db.students.push({ id: generateId(), name, rollNo: roll, password: pass || roll, classId: cls, profile: {} });
    saveDB(db); showToast('Student Added'); renderAdminStudentList();
    // Clear inputs
    document.getElementById('new-stu-name').value = '';
    document.getElementById('new-stu-roll').value = '';
}

// ==================== TEACHER MODULE ====================
let teacherActiveClassName = '';
let teacherActiveClassId = '';

function initTeacherDash() {
    document.getElementById('teach-name-display').innerText = currentUser.name;
    const db = getDB();
    const myAssignments = db.assignments.filter(a => a.teacherId === currentUser.id);
    const list = document.getElementById('teach-class-list');
    list.innerHTML = '';
    
    if(myAssignments.length === 0) {
        list.innerHTML = '<p class="text-sm text-gray-400 italic">No classes assigned.</p>';
        return;
    }

    myAssignments.forEach(a => {
        const cls = db.classes.find(c => c.id === a.classId);
        if(cls) {
            list.innerHTML += `<button onclick="loadTeacherClass('${cls.id}', '${cls.name}')" class="w-full text-left px-3 py-2 rounded hover:bg-emerald-800 text-sm mb-1 bg-emerald-800/50">${cls.name}</button>`;
        }
    });
    
    // Load first class by default
    const firstCls = db.classes.find(c => c.id === myAssignments[0].classId);
    if(firstCls) loadTeacherClass(firstCls.id, firstCls.name);
}

function loadTeacherClass(id, name) {
    teacherActiveClassId = id;
    teacherActiveClassName = name;
    document.getElementById('teach-header-title').innerText = name;
    teacherView('attendance'); // Default view
}

function teacherView(view) {
    if(!teacherActiveClassId) return;
    const container = document.getElementById('teach-content');
    const db = getDB();
    const students = db.students.filter(s => s.classId === teacherActiveClassId);
    
    // Highlight buttons
    document.getElementById('btn-view-att').className = view === 'attendance' ? "px-4 py-2 rounded text-sm font-bold bg-emerald-100 text-emerald-700" : "px-4 py-2 rounded text-sm font-bold text-gray-500 hover:bg-emerald-50 transition";
    document.getElementById('btn-view-res').className = view === 'results' ? "px-4 py-2 rounded text-sm font-bold bg-emerald-100 text-emerald-700" : "px-4 py-2 rounded text-sm font-bold text-gray-500 hover:bg-emerald-50 transition";

    if(view === 'attendance') {
        let html = `<div class="bg-white p-6 rounded-lg shadow mb-4"><div class="flex justify-between items-center mb-4"><h3 class="font-bold">Mark Attendance</h3><input type="date" id="att-date" class="border p-2 rounded text-sm" value="${new Date().toISOString().split('T')[0]}"></div><div class="space-y-2">`;
        students.forEach(s => {
            html += `<div class="flex justify-between items-center p-3 border rounded bg-gray-50"><span class="font-medium">${s.name} (${s.rollNo})</span><select class="att-selector border p-1 rounded text-sm" data-id="${s.id}"><option value="P">Present</option><option value="A" class="text-red-600">Absent</option></select></div>`;
        });
        html += `</div><button onclick="saveAttendance()" class="mt-4 w-full bg-emerald-600 text-white py-3 rounded font-bold">Save Attendance</button></div>`;
        container.innerHTML = html;
    } 
    else if (view === 'results') {
        const cls = db.classes.find(c => c.id === teacherActiveClassId);
        let subHeaders = cls.subjects.map(s => `<th class="p-2 border text-center">${s}</th>`).join('');
        let inputs = '';
        
        students.forEach(s => {
            let markInputs = cls.subjects.map(sub => `<td class="p-1 border"><input type="number" class="w-full p-1 text-center outline-none res-input" data-sid="${s.id}" data-sub="${sub}"></td>`).join('');
            inputs += `<tr><td class="p-2 border font-medium">${s.name}</td>${markInputs}</tr>`;
        });

        container.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow">
                <div class="mb-4 flex gap-2"><input id="exam-name" placeholder="Exam Name (e.g., Mid Term)" class="border p-2 rounded flex-1"><button onclick="saveResults()" class="bg-emerald-600 text-white px-6 rounded font-bold">Publish</button></div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead><tr class="bg-gray-100"><th class="p-2 border text-left">Student</th>${subHeaders}</tr></thead>
                        <tbody>${inputs}</tbody>
                    </table>
                </div>
            </div>`;
    }
}

function saveAttendance() {
    const date = document.getElementById('att-date').value;
    const selects = document.querySelectorAll('.att-selector');
    const db = getDB();
    
    // Remove existing for this date/class to prevent dupes
    db.attendance = db.attendance.filter(a => !(a.date === date && a.classId === teacherActiveClassId));
    
    selects.forEach(sel => {
        db.attendance.push({
            date,
            classId: teacherActiveClassId,
            studentId: sel.dataset.id,
            status: sel.value
        });
    });
    saveDB(db); showToast('Attendance Saved');
}

function saveResults() {
    const examName = document.getElementById('exam-name').value;
    if(!examName) return showToast('Enter Exam Name', 'error');
    
    const inputs = document.querySelectorAll('.res-input');
    const db = getDB();
    
    // Group marks by student
    const studentMarks = {};
    inputs.forEach(inp => {
        const sid = inp.dataset.sid;
        const sub = inp.dataset.sub;
        const score = inp.value;
        if(score) {
            if(!studentMarks[sid]) studentMarks[sid] = {};
            studentMarks[sid][sub] = score;
        }
    });

    // Save to DB
    for (const [sid, marks] of Object.entries(studentMarks)) {
        db.results.push({
            id: generateId(),
            examName,
            classId: teacherActiveClassId,
            studentId: sid,
            marks,
            date: new Date().toLocaleDateString()
        });
    }
    saveDB(db); showToast('Results Published');
}

// ==================== STUDENT MODULE ====================
function initStudentDash() {
    document.getElementById('stu-name-display').innerText = currentUser.name;
    document.getElementById('stu-id-display').innerText = `Roll: ${currentUser.rollNo}`;
    studentTab('overview');
}

function studentTab(tab) {
    const content = document.getElementById('student-content');
    const db = getDB();
    
    if(tab === 'overview') {
        // Calculate Attendance %
        const myAtt = db.attendance.filter(a => a.studentId === currentUser.id);
        const present = myAtt.filter(a => a.status === 'P').length;
        const total = myAtt.length;
        const perc = total > 0 ? Math.round((present/total)*100) : 0;
        
        // Get Results
        const myResults = db.results.filter(r => r.studentId === currentUser.id);
        
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">${perc}%</div>
                    <div><p class="text-xs font-bold text-gray-400 uppercase">Attendance</p><p class="text-sm text-gray-600">${present}/${total} Days</p></div>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex items-center gap-4">
                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl font-bold">${myResults.length}</div>
                    <div><p class="text-xs font-bold text-gray-400 uppercase">Exams Taken</p><p class="text-sm text-gray-600">Total</p></div>
                </div>
            </div>
            <h3 class="font-bold text-lg mb-4 text-slate-700">Recent Results</h3>
            <div class="grid gap-4 md:grid-cols-2">
                ${myResults.map(r => `
                    <div class="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition flex justify-between items-center">
                        <div><h4 class="font-bold text-slate-800">${r.examName}</h4><p class="text-xs text-gray-500">${r.date}</p></div>
                        <button onclick="renderReportCard('${r.id}')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition">View Report</button>
                    </div>
                `).join('')}
            </div>`;
    } 
    else if (tab === 'profile') {
        content.innerHTML = `
        <div class="bg-white p-8 rounded-2xl shadow-sm max-w-xl">
            <h3 class="font-bold mb-6">Update Profile</h3>
            <div class="space-y-4">
                <div><label class="text-xs font-bold text-gray-500">Phone</label><input id="up-phone" value="${currentUser.profile.phone||''}" class="w-full border p-2 rounded"></div>
                <div><label class="text-xs font-bold text-gray-500">Address</label><input id="up-addr" value="${currentUser.profile.address||''}" class="w-full border p-2 rounded"></div>
                <div><label class="text-xs font-bold text-gray-500">Change Password</label><input id="up-pass" type="password" class="w-full border p-2 rounded" placeholder="New Password"></div>
            </div>
            <button onclick="updateStudentProfile()" class="mt-6 w-full bg-purple-600 text-white py-3 rounded-lg font-bold">Save Changes</button>
        </div>`;
    }
}

function updateStudentProfile() {
    const phone = document.getElementById('up-phone').value;
    const addr = document.getElementById('up-addr').value;
    const pass = document.getElementById('up-pass').value;
    
    const db = getDB();
    const idx = db.students.findIndex(s => s.id === currentUser.id);
    if(idx > -1) {
        db.students[idx].profile = { phone, address: addr };
        if(pass) db.students[idx].password = pass;
        saveDB(db);
        currentUser = db.students[idx];
        sessionStorage.setItem('school_session', JSON.stringify(currentUser));
        showToast('Profile Updated');
    }
}

// --- MODAL SYSTEM ---
function openModal(type, id = null) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    modal.classList.remove('hidden');
    
    if (type === 'addClass') {
        title.innerText = "Add New Class";
        body.innerHTML = `<input id="inp-class-name" class="w-full border p-2 rounded mb-4" placeholder="Class Name (e.g. 10-A)"><button onclick="addClass()" class="bg-blue-600 text-white w-full py-2 rounded font-bold">Create</button>`;
    } 
    else if (type === 'addSubject') {
        title.innerText = "Add Subject";
        body.innerHTML = `<input id="inp-sub-name" class="w-full border p-2 rounded mb-4" placeholder="Subject Name"><button onclick="addSubject('${id}')" class="bg-blue-600 text-white w-full py-2 rounded font-bold">Add</button>`;
    }
    else if (type === 'addTeacher') {
        title.innerText = "Add Teacher";
        body.innerHTML = `<input id="inp-teach-name" class="w-full border p-2 rounded mb-2" placeholder="Name"><input id="inp-teach-user" class="w-full border p-2 rounded mb-2" placeholder="Username"><input id="inp-teach-pass" class="w-full border p-2 rounded mb-4" placeholder="Password"><button onclick="addTeacher()" class="bg-blue-600 text-white w-full py-2 rounded font-bold">Add</button>`;
    }
    else if (type === 'assignClass') {
        const db = getDB();
        const options = db.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        title.innerText = "Assign Class";
        body.innerHTML = `<p class="text-sm text-gray-500 mb-2">Select class for this teacher:</p><select id="inp-assign-class" class="w-full border p-2 rounded mb-4 bg-white"><option value="">No Class</option>${options}</select><button onclick="assignClass('${id}')" class="bg-blue-600 text-white w-full py-2 rounded font-bold">Save Assignment</button>`;
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// --- REPORT CARD GENERATION ---
function renderReportCard(resultId) {
    const db = getDB();
    const res = db.results.find(r => r.id === resultId);
    
    // Simple modal based report card for now (can be enhanced to PDF logic)
    // Using existing modal for simplicity
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerText = res.examName + " Report";
    
    let rows = '';
    let total = 0;
    for(const [sub, score] of Object.entries(res.marks)) {
        total += parseInt(score);
        rows += `<div class="flex justify-between border-b py-2"><span>${sub}</span><span class="font-bold">${score}</span></div>`;
    }
    
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-1">
            ${rows}
            <div class="flex justify-between pt-4 mt-2 border-t border-black font-bold text-lg">
                <span>Grand Total</span><span>${total}</span>
            </div>
        </div>
        <button onclick="window.print()" class="mt-6 w-full bg-gray-800 text-white py-2 rounded no-print">Print / Save PDF</button>
    `;
    modal.classList.remove('hidden');
}