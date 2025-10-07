// Student Records Management System
class StudentManager {
    constructor() {
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        this.currentStudentId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.displayStudents();
        this.setupToastr();
    }

    bindEvents() {
        // Student form events
        document.getElementById('addStudentBtn').addEventListener('click', () => this.openStudentModal());
        document.getElementById('saveStudentBtn').addEventListener('click', () => this.saveStudent());
        
        // Form submission prevention
        document.getElementById('studentForm').addEventListener('submit', (e) => e.preventDefault());
    }

    setupToastr() {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 3000
        };
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    openStudentModal(student = null) {
        const modal = new bootstrap.Modal(document.getElementById('studentModal'));
        const title = document.getElementById('modalTitle');
        
        if (student) {
            title.textContent = 'Edit Student';
            this.currentStudentId = student.id;
            this.populateStudentForm(student);
        } else {
            title.textContent = 'Add Student';
            this.currentStudentId = null;
            this.clearStudentForm();
        }
        
        modal.show();
    }

    populateStudentForm(student) {
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentEmail').value = student.email;
        document.getElementById('studentPhone').value = student.phone;
    }

    clearStudentForm() {
        document.getElementById('studentForm').reset();
        document.getElementById('studentId').value = '';
    }

    saveStudent() {
        const name = document.getElementById('studentName').value.trim();
        const email = document.getElementById('studentEmail').value.trim();
        const phone = document.getElementById('studentPhone').value.trim();

        if (!name || !email || !phone) {
            toastr.error('Please fill in all fields');
            return;
        }

        const studentData = {
            id: this.currentStudentId || this.generateId(),
            name,
            email,
            phone,
            marks: [],
            attendance: []
        };

        if (this.currentStudentId) {
            // Update existing student
            this.updateStudent(studentData);
        } else {
            // Add new student
            this.addStudent(studentData);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
        modal.hide();
    }

    addStudent(student) {
        this.students.push(student);
        this.saveToStorage();
        this.displayStudents();
        toastr.success('Student added successfully!');
    }

    updateStudent(updatedStudent) {
        const index = this.students.findIndex(s => s.id === updatedStudent.id);
        if (index !== -1) {
            // Preserve existing marks and attendance
            updatedStudent.marks = this.students[index].marks;
            updatedStudent.attendance = this.students[index].attendance;
            this.students[index] = updatedStudent;
            this.saveToStorage();
            this.displayStudents();
            toastr.success('Student updated successfully!');
        }
    }

    saveToStorage() {
        localStorage.setItem('students', JSON.stringify(this.students));
    }

    displayStudents() {
        const studentList = document.getElementById('studentList');
        studentList.innerHTML = '';

        if (this.students.length === 0) {
            studentList.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted">No students found. Add your first student!</p>
                </div>
            `;
            return;
        }

        this.students.forEach(student => {
            const studentCard = this.createStudentCard(student);
            studentList.appendChild(studentCard);
        });
    }

    createStudentCard(student) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-3';
        
        col.innerHTML = `
            <div class="card student-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${student.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">Email: ${student.email}</small><br>
                        <small class="text-muted">Phone: ${student.phone}</small>
                    </p>
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-primary">Marks: ${student.marks.length}</span>
                        <span class="badge bg-success">Attendance: ${student.attendance.length}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="studentManager.viewStudent('${student.id}')">
                        View
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="studentManager.openStudentModal(studentManager.getStudentById('${student.id}'))">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="studentManager.deleteStudent('${student.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        return col;
    }

    getStudentById(id) {
        return this.students.find(student => student.id === id);
    }

    viewStudent(id) {
        toastr.info(`Viewing student details - Feature coming soon!`);
        // We'll implement detailed view in next phase
    }

    deleteStudent(id) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.students = this.students.filter(student => student.id !== id);
                this.saveToStorage();
                this.displayStudents();
                toastr.success('Student deleted successfully!');
            }
        });
    }
}

// Initialize the application
const studentManager = new StudentManager();
