// Student Records Management System with JSONBin Integration
class StudentManager {
    constructor() {
        // JSONBin Configuration - REPLACE WITH YOUR ACTUAL API KEY
        this.jsonBinConfig = {
            apiKey: '$2a$10$euqBnYFxO/WvbXbk9nLtRuvL6P7Yn4nTRf4XZYNv/sHCy2i1rHuEG', // Replace with your actual API key
            binId: null, // We'll create this dynamically
            baseUrl: "https://api.jsonbin.io/v3/b",
        };

        this.students = [];
        this.currentStudentId = null;
        this.currentMarkId = null;
        this.currentAttendanceId = null;
        this.isOnline = true;

        this.init();
    }

    async init() {
        await this.bindEvents();
        await this.loadData();
        this.displayStudents();
        this.setupToastr();
        this.initializeAllDemonstrations();
    }

    async bindEvents() {
        // Student form events
        document
            .getElementById("addStudentBtn")
            .addEventListener("click", () => this.openStudentModal());
        document
            .getElementById("saveStudentBtn")
            .addEventListener("click", () => this.saveStudent());

        // Mark form events
        document
            .getElementById("addMarkBtn")
            .addEventListener("click", () => this.openMarkModal());
        document
            .getElementById("saveMarkBtn")
            .addEventListener("click", () => this.saveMark());

        // Attendance form events
        document
            .getElementById("addAttendanceBtn")
            .addEventListener("click", () => this.openAttendanceModal());
        document
            .getElementById("saveAttendanceBtn")
            .addEventListener("click", () => this.saveAttendance());

        // Mark calculation events
        document
            .getElementById("totalMarks")
            .addEventListener("input", () => this.calculatePercentage());
        document
            .getElementById("securedMarks")
            .addEventListener("input", () => this.calculatePercentage());

        // Attendance calculation events
        document
            .getElementById("totalClasses")
            .addEventListener("input", () => this.calculateAttendancePercentage());
        document
            .getElementById("classesAttended")
            .addEventListener("input", () => this.calculateAttendancePercentage());

        // Form submission prevention
        document
            .getElementById("studentForm")
            .addEventListener("submit", (e) => e.preventDefault());
        document
            .getElementById("markForm")
            .addEventListener("submit", (e) => e.preventDefault());
        document
            .getElementById("attendanceForm")
            .addEventListener("submit", (e) => e.preventDefault());
    }

    setupToastr() {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 3000,
        };
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // JSONBin API Methods
    async createBin() {
        try {
            const response = await fetch(this.jsonBinConfig.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Master-Key": this.jsonBinConfig.apiKey,
                    "X-Bin-Name": "StudentRecordsData",
                },
                body: JSON.stringify({ students: [] }),
            });

            if (!response.ok) {
                throw new Error("Failed to create bin");
            }

            const data = await response.json();
            this.jsonBinConfig.binId = data.metadata.id;
            localStorage.setItem("jsonBinId", this.jsonBinConfig.binId);

            toastr.success("Cloud storage initialized!");
            return data.metadata.id;
        } catch (error) {
            console.error("Error creating bin:", error);
            this.isOnline = false;
            toastr.warning("Using local storage only");
            return null;
        }
    }

    async loadData() {
        // Try to load from JSONBin first
        try {
            // Check if we have a bin ID stored
            const storedBinId = localStorage.getItem("jsonBinId");

            if (storedBinId) {
                this.jsonBinConfig.binId = storedBinId;
            } else if (
                this.jsonBinConfig.apiKey &&
                this.jsonBinConfig.apiKey !== "YOUR_JSONBIN_API_KEY_HERE"
            ) {
                // Create new bin if we have API key but no bin ID
                await this.createBin();
            }

            if (this.jsonBinConfig.binId) {
                const response = await fetch(
                    `${this.jsonBinConfig.baseUrl}/${this.jsonBinConfig.binId}/latest`,
                    {
                        method: "GET",
                        headers: {
                            "X-Master-Key": this.jsonBinConfig.apiKey,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    this.students = data.record.students || [];
                    this.isOnline = true;
                    toastr.success("Data loaded from cloud!");
                    return;
                }
            }
        } catch (error) {
            console.warn("Failed to load from JSONBin:", error);
            this.isOnline = false;
        }

        // Fallback to local storage
        const localData = JSON.parse(localStorage.getItem("students"));
        if (localData) {
            this.students = localData;
            toastr.info("Data loaded from local storage");
        } else {
            this.students = [];
        }
    }

    async saveToStorage() {
        // Save to local storage first (for offline capability)
        localStorage.setItem("students", JSON.stringify(this.students));

        // Try to save to JSONBin if online
        if (
            this.isOnline &&
            this.jsonBinConfig.binId &&
            this.jsonBinConfig.apiKey &&
            this.jsonBinConfig.apiKey !== "YOUR_JSONBIN_API_KEY_HERE"
        ) {
            try {
                const response = await fetch(
                    `${this.jsonBinConfig.baseUrl}/${this.jsonBinConfig.binId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Master-Key": this.jsonBinConfig.apiKey,
                        },
                        body: JSON.stringify({ students: this.students }),
                    }
                );

                if (response.ok) {
                    console.log("Data saved to JSONBin");
                    this.updateSyncStatus(true);
                } else {
                    throw new Error("Failed to save to JSONBin");
                }
            } catch (error) {
                console.warn("Failed to save to JSONBin:", error);
                this.isOnline = false;
                this.updateSyncStatus(false);
                toastr.warning("Offline mode - data saved locally only");
            }
        } else {
            this.updateSyncStatus(false);
        }
    }

    updateSyncStatus(online) {
        const syncIndicator = document.getElementById("syncIndicator");
        if (!syncIndicator) {
            // Create sync indicator if it doesn't exist
            const nav = document.querySelector(".navbar .container");
            const indicator = document.createElement("div");
            indicator.id = "syncIndicator";
            indicator.className = `badge ${online ? "bg-success" : "bg-warning"}`;
            indicator.innerHTML = online ? "🟢 Synced" : "🟠 Local Only";
            indicator.style.marginLeft = "auto";
            indicator.style.marginRight = "10px";
            nav.appendChild(indicator);
        } else {
            syncIndicator.className = `badge ${online ? "bg-success" : "bg-warning"}`;
            syncIndicator.innerHTML = online ? "🟢 Synced" : "🟠 Local Only";
        }
    }

    // Student Management Methods
    openStudentModal(student = null) {
        const modal = new bootstrap.Modal(document.getElementById("studentModal"));
        const title = document.getElementById("modalTitle");

        if (student) {
            title.textContent = "Edit Student";
            this.currentStudentId = student.id;
            this.populateStudentForm(student);
        } else {
            title.textContent = "Add Student";
            this.currentStudentId = null;
            this.clearStudentForm();
        }

        modal.show();
    }

    populateStudentForm(student) {
        document.getElementById("studentId").value = student.id;
        document.getElementById("studentName").value = student.name;
        document.getElementById("studentEmail").value = student.email;
        document.getElementById("studentPhone").value = student.phone;
    }

    clearStudentForm() {
        document.getElementById("studentForm").reset();
        document.getElementById("studentId").value = "";
    }

    async saveStudent() {
        const name = document.getElementById("studentName").value.trim();
        const email = document.getElementById("studentEmail").value.trim();
        const phone = document.getElementById("studentPhone").value.trim();

        if (!name || !email || !phone) {
            toastr.error("Please fill in all fields");
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toastr.error("Please enter a valid email address");
            return;
        }

        const studentData = {
            id: this.currentStudentId || this.generateId(),
            name,
            email,
            phone,
            marks: [],
            attendance: [],
        };

        if (this.currentStudentId) {
            // Update existing student
            await this.updateStudent(studentData);
        } else {
            // Add new student
            await this.addStudent(studentData);
        }

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("studentModal")
        );
        modal.hide();
    }

    async addStudent(student) {
        this.students.push(student);
        await this.saveToStorage();
        this.displayStudents();
        toastr.success("Student added successfully!");
    }

    async updateStudent(updatedStudent) {
        const index = this.students.findIndex((s) => s.id === updatedStudent.id);
        if (index !== -1) {
            // Preserve existing marks and attendance
            updatedStudent.marks = this.students[index].marks;
            updatedStudent.attendance = this.students[index].attendance;
            this.students[index] = updatedStudent;
            await this.saveToStorage();
            this.displayStudents();
            toastr.success("Student updated successfully!");
        }
    }

    displayStudents() {
        const studentList = document.getElementById("studentList");
        studentList.innerHTML = "";

        if (this.students.length === 0) {
            studentList.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted">No students found. Add your first student!</p>
                    ${!this.isOnline
                    ? '<div class="alert alert-warning mt-2">Offline Mode - Data saved locally</div>'
                    : ""
                }
                </div>
            `;
            return;
        }

        this.students.forEach((student) => {
            const studentCard = this.createStudentCard(student);
            studentList.appendChild(studentCard);
        });
    }

    createStudentCard(student) {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 mb-3";

        // Calculate average marks if available
        const avgMarks =
            student.marks.length > 0
                ? (
                    student.marks.reduce((sum, mark) => sum + mark.percentage, 0) /
                    student.marks.length
                ).toFixed(1)
                : "N/A";

        // Calculate average attendance if available
        const avgAttendance =
            student.attendance.length > 0
                ? (
                    student.attendance.reduce((sum, att) => sum + att.percentage, 0) /
                    student.attendance.length
                ).toFixed(1)
                : "N/A";

        col.innerHTML = `
            <div class="card student-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${student.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">Email: ${student.email
            }</small><br>
                        <small class="text-muted">Phone: ${student.phone
            }</small>
                    </p>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="badge bg-primary">Marks: ${student.marks.length
            }</span>
                        <span class="badge bg-success">Attendance: ${student.attendance.length
            }</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <small>Avg Marks: <strong>${avgMarks}%</strong></small>
                        <small>Avg Attendance: <strong>${avgAttendance}%</strong></small>
                    </div>
                    ${student.marks.length > 0
                ? `
                        <div class="progress mb-2" style="height: 6px;">
                            <div class="progress-bar bg-info" style="width: ${Math.min(
                    avgMarks,
                    100
                )}%"></div>
                        </div>
                    `
                : ""
            }
                    ${student.attendance.length > 0
                ? `
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-success" style="width: ${Math.min(
                    avgAttendance,
                    100
                )}%"></div>
                        </div>
                    `
                : ""
            }
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="studentManager.viewStudent('${student.id
            }')">
                        Manage
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="studentManager.openStudentModal(studentManager.getStudentById('${student.id
            }'))">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="studentManager.deleteStudent('${student.id
            }')">
                        Delete
                    </button>
                </div>
            </div>
        `;

        return col;
    }

    getStudentById(id) {
        return this.students.find((student) => student.id === id);
    }

    viewStudent(id) {
        const student = this.getStudentById(id);
        if (!student) {
            toastr.error("Student not found");
            return;
        }

        this.currentStudentId = id;

        // Populate student details
        document.getElementById("detailStudentName").textContent = student.name;
        document.getElementById("detailStudentEmail").textContent = student.email;
        document.getElementById("detailStudentPhone").textContent = student.phone;
        document.getElementById(
            "studentDetailsTitle"
        ).textContent = `${student.name} - Details`;

        // Display marks and attendance
        this.displayMarks(student);
        this.displayAttendance(student);

        // Show the modal
        const modal = new bootstrap.Modal(
            document.getElementById("studentDetailsModal")
        );
        modal.show();
    }

    async deleteStudent(id) {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                this.students = this.students.filter((student) => student.id !== id);
                await this.saveToStorage();
                this.displayStudents();
                toastr.success("Student deleted successfully!");
            }
        });
    }

    // Marks Management Methods
    openMarkModal(mark = null) {
        const modal = new bootstrap.Modal(document.getElementById("markModal"));
        const title = document.getElementById("markModalTitle");

        if (mark) {
            title.textContent = "Edit Marks";
            this.currentMarkId = mark.id;
            this.populateMarkForm(mark);
        } else {
            title.textContent = "Add Marks";
            this.currentMarkId = null;
            this.clearMarkForm();
        }

        modal.show();
    }

    populateMarkForm(mark) {
        document.getElementById("markId").value = mark.id;
        document.getElementById("courseName").value = mark.course;
        document.getElementById("moduleName").value = mark.module;
        document.getElementById("totalMarks").value = mark.totalMarks;
        document.getElementById("securedMarks").value = mark.securedMarks;
        this.calculatePercentage();
    }

    clearMarkForm() {
        document.getElementById("markForm").reset();
        document.getElementById("markId").value = "";
        document.getElementById("marksPercentage").value = "";
    }

    calculatePercentage() {
        const totalMarks =
            parseFloat(document.getElementById("totalMarks").value) || 0;
        const securedMarks =
            parseFloat(document.getElementById("securedMarks").value) || 0;

        if (totalMarks > 0 && securedMarks >= 0) {
            const percentage = (securedMarks / totalMarks) * 100;
            document.getElementById("marksPercentage").value = percentage.toFixed(2);
        } else {
            document.getElementById("marksPercentage").value = "";
        }
    }

    async saveMark() {
        const course = document.getElementById("courseName").value.trim();
        const module = document.getElementById("moduleName").value.trim();
        const totalMarks = parseFloat(document.getElementById("totalMarks").value);
        const securedMarks = parseFloat(
            document.getElementById("securedMarks").value
        );

        // Validation
        if (!course || !module || !totalMarks || securedMarks < 0) {
            toastr.error("Please fill in all fields correctly");
            return;
        }

        if (securedMarks > totalMarks) {
            toastr.error("Secured marks cannot exceed total marks");
            return;
        }

        const percentage = (securedMarks / totalMarks) * 100;

        const markData = {
            id: this.currentMarkId || this.generateId(),
            course,
            module,
            totalMarks,
            securedMarks,
            percentage: parseFloat(percentage.toFixed(2)),
        };

        const student = this.getStudentById(this.currentStudentId);
        if (!student) {
            toastr.error("Student not found");
            return;
        }

        if (this.currentMarkId) {
            // Update existing mark
            await this.updateMark(student, markData);
        } else {
            // Add new mark
            await this.addMark(student, markData);
        }

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("markModal")
        );
        modal.hide();
    }

    async addMark(student, mark) {
        student.marks.push(mark);
        await this.saveToStorage();
        this.displayMarks(student);
        toastr.success("Marks added successfully!");
    }

    async updateMark(student, updatedMark) {
        const index = student.marks.findIndex((m) => m.id === updatedMark.id);
        if (index !== -1) {
            student.marks[index] = updatedMark;
            await this.saveToStorage();
            this.displayMarks(student);
            toastr.success("Marks updated successfully!");
        }
    }

    displayMarks(student) {
        const marksList = document.getElementById("marksList");
        marksList.innerHTML = "";

        if (student.marks.length === 0) {
            marksList.innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted">No marks recorded yet.</p>
                </div>
            `;
            return;
        }

        student.marks.forEach((mark) => {
            const markElement = this.createMarkElement(mark);
            marksList.appendChild(markElement);
        });
    }

    createMarkElement(mark) {
        const div = document.createElement("div");
        div.className = `card mb-2 marks-card ${mark.percentage >= 80
                ? "high-score"
                : mark.percentage >= 50
                    ? "medium-score"
                    : "low-score"
            }`;

        div.innerHTML = `
            <div class="card-body py-2">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <strong>${mark.course}</strong>
                        <br>
                        <small class="text-muted">${mark.module}</small>
                    </div>
                    <div class="col-md-3">
                        <small>Marks: ${mark.securedMarks}/${mark.totalMarks
            }</small>
                    </div>
                    <div class="col-md-3">
                        <span class="percentage-display ${mark.percentage >= 80
                ? "text-success"
                : mark.percentage >= 50
                    ? "text-warning"
                    : "text-danger"
            }">
                            ${mark.percentage}%
                        </span>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-sm btn-outline-warning me-1" 
                                onclick="studentManager.openMarkModal(studentManager.getMarkById('${mark.id
            }'))">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="studentManager.deleteMark('${mark.id
            }')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    getMarkById(markId) {
        const student = this.getStudentById(this.currentStudentId);
        return student ? student.marks.find((mark) => mark.id === markId) : null;
    }

    async deleteMark(markId) {
        Swal.fire({
            title: "Delete Marks?",
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                const student = this.getStudentById(this.currentStudentId);
                if (student) {
                    student.marks = student.marks.filter((mark) => mark.id !== markId);
                    await this.saveToStorage();
                    this.displayMarks(student);
                    toastr.success("Marks deleted successfully!");
                }
            }
        });
    }

    // Attendance Management Methods
    openAttendanceModal(attendance = null) {
        const modal = new bootstrap.Modal(
            document.getElementById("attendanceModal")
        );
        const title = document.getElementById("attendanceModalTitle");

        if (attendance) {
            title.textContent = "Edit Attendance";
            this.currentAttendanceId = attendance.id;
            this.populateAttendanceForm(attendance);
        } else {
            title.textContent = "Add Attendance";
            this.currentAttendanceId = null;
            this.clearAttendanceForm();
        }

        modal.show();
    }

    populateAttendanceForm(attendance) {
        document.getElementById("attendanceId").value = attendance.id;
        document.getElementById("attendanceCourse").value = attendance.course;
        document.getElementById("totalClasses").value = attendance.totalClasses;
        document.getElementById("classesAttended").value =
            attendance.classesAttended;
        this.calculateAttendancePercentage();
    }

    clearAttendanceForm() {
        document.getElementById("attendanceForm").reset();
        document.getElementById("attendanceId").value = "";
        document.getElementById("attendancePercentage").value = "";
    }

    calculateAttendancePercentage() {
        const totalClasses =
            parseFloat(document.getElementById("totalClasses").value) || 0;
        const classesAttended =
            parseFloat(document.getElementById("classesAttended").value) || 0;

        if (totalClasses > 0 && classesAttended >= 0) {
            const percentage = (classesAttended / totalClasses) * 100;
            document.getElementById("attendancePercentage").value =
                percentage.toFixed(2);
        } else {
            document.getElementById("attendancePercentage").value = "";
        }
    }

    async saveAttendance() {
        const course = document.getElementById("attendanceCourse").value.trim();
        const totalClasses = parseFloat(
            document.getElementById("totalClasses").value
        );
        const classesAttended = parseFloat(
            document.getElementById("classesAttended").value
        );

        // Validation
        if (!course || !totalClasses || classesAttended < 0) {
            toastr.error("Please fill in all fields correctly");
            return;
        }

        if (classesAttended > totalClasses) {
            toastr.error("Classes attended cannot exceed total classes");
            return;
        }

        const percentage = (classesAttended / totalClasses) * 100;

        const attendanceData = {
            id: this.currentAttendanceId || this.generateId(),
            course,
            totalClasses,
            classesAttended,
            percentage: parseFloat(percentage.toFixed(2)),
        };

        const student = this.getStudentById(this.currentStudentId);
        if (!student) {
            toastr.error("Student not found");
            return;
        }

        if (this.currentAttendanceId) {
            // Update existing attendance
            await this.updateAttendance(student, attendanceData);
        } else {
            // Add new attendance
            await this.addAttendance(student, attendanceData);
        }

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("attendanceModal")
        );
        modal.hide();
    }

    async addAttendance(student, attendance) {
        student.attendance.push(attendance);
        await this.saveToStorage();
        this.displayAttendance(student);
        toastr.success("Attendance record added successfully!");
    }

    async updateAttendance(student, updatedAttendance) {
        const index = student.attendance.findIndex(
            (a) => a.id === updatedAttendance.id
        );
        if (index !== -1) {
            student.attendance[index] = updatedAttendance;
            await this.saveToStorage();
            this.displayAttendance(student);
            toastr.success("Attendance record updated successfully!");
        }
    }

    displayAttendance(student) {
        const attendanceList = document.getElementById("attendanceList");
        attendanceList.innerHTML = "";

        if (student.attendance.length === 0) {
            attendanceList.innerHTML = `
                <div class="text-center py-3">
                    <p class="text-muted">No attendance records yet.</p>
                </div>
            `;
            return;
        }

        // Add attendance summary
        const summary = this.createAttendanceSummary(student);
        attendanceList.appendChild(summary);

        // Add individual attendance records
        student.attendance.forEach((attendance) => {
            const attendanceElement = this.createAttendanceElement(attendance);
            attendanceList.appendChild(attendanceElement);
        });
    }

    createAttendanceSummary(student) {
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "row mb-4";

        const totalAttendance = student.attendance.length;
        const overallPercentage =
            totalAttendance > 0
                ? (
                    student.attendance.reduce((sum, att) => sum + att.percentage, 0) /
                    totalAttendance
                ).toFixed(1)
                : 0;

        const statusClass = this.getAttendanceStatusClass(overallPercentage);

        summaryDiv.innerHTML = `
            <div class="col-12">
                <div class="card summary-card border-0 bg-light">
                    <div class="card-body text-center">
                        <h6 class="card-title">Overall Attendance Summary</h6>
                        <div class="row">
                            <div class="col-md-4">
                                <h4 class="${statusClass}">${overallPercentage}%</h4>
                                <small class="text-muted">Average Attendance</small>
                            </div>
                            <div class="col-md-4">
                                <h4>${totalAttendance}</h4>
                                <small class="text-muted">Courses</small>
                            </div>
                            <div class="col-md-4">
                                <h4>${this.getAttendanceStatusText(
            overallPercentage
        )}</h4>
                                <small class="text-muted">Status</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return summaryDiv;
    }

    createAttendanceElement(attendance) {
        const div = document.createElement("div");
        div.className = `card mb-2 attendance-card ${attendance.percentage >= 90
                ? "high-attendance"
                : attendance.percentage >= 75
                    ? "medium-attendance"
                    : "low-attendance"
            }`;

        const statusClass = this.getAttendanceStatusClass(attendance.percentage);

        div.innerHTML = `
            <div class="card-body py-2">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <strong>${attendance.course}</strong>
                    </div>
                    <div class="col-md-3">
                        <small>Attendance: ${attendance.classesAttended}/${attendance.totalClasses}</small>
                    </div>
                    <div class="col-md-3">
                        <span class="percentage-display ${statusClass}">
                            ${attendance.percentage}%
                        </span>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-sm btn-outline-warning me-1" 
                                onclick="studentManager.openAttendanceModal(studentManager.getAttendanceById('${attendance.id}'))">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="studentManager.deleteAttendance('${attendance.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    getAttendanceStatusClass(percentage) {
        if (percentage >= 90) return "status-excellent";
        if (percentage >= 80) return "status-good";
        if (percentage >= 75) return "status-warning";
        return "status-danger";
    }

    getAttendanceStatusText(percentage) {
        if (percentage >= 90) return "Excellent";
        if (percentage >= 80) return "Good";
        if (percentage >= 75) return "Warning";
        return "Poor";
    }

    getAttendanceById(attendanceId) {
        const student = this.getStudentById(this.currentStudentId);
        return student
            ? student.attendance.find((attendance) => attendance.id === attendanceId)
            : null;
    }

    async deleteAttendance(attendanceId) {
        Swal.fire({
            title: "Delete Attendance Record?",
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                const student = this.getStudentById(this.currentStudentId);
                if (student) {
                    student.attendance = student.attendance.filter(
                        (attendance) => attendance.id !== attendanceId
                    );
                    await this.saveToStorage();
                    this.displayAttendance(student);
                    toastr.success("Attendance record deleted successfully!");
                }
            }
        });
    }

    // Export data method (useful for backup)
    exportData() {
        const dataStr = JSON.stringify(this.students, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "student_records_backup.json";
        link.click();
        URL.revokeObjectURL(url);
        toastr.success("Data exported successfully!");
    }

    // Import data method
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    this.students = importedData;
                    await this.saveToStorage();
                    this.displayStudents();
                    toastr.success("Data imported successfully!");
                } else {
                    toastr.error("Invalid file format");
                }
            } catch (error) {
                toastr.error("Error importing data");
            }
        };
        reader.readAsText(file);
    }
    // LO4: Programming Techniques Demonstration
    demonstrateProgrammingTechniques() {
        // Comparison operator (LO4)
        const studentCount = this.students.length;
        const hasStudents = studentCount > 0; // Comparison operator

        // Logical operator (LO4)
        const canExport = hasStudents && this.isOnline; // Logical AND operator

        // Function call (LO4)
        this.showProgrammingDemo(hasStudents, canExport, studentCount);

        // Branching (LO4)
        let statusMessage;
        if (studentCount === 0) {
            statusMessage = "No students available";
        } else if (studentCount === 1) {
            statusMessage = "1 student found";
        } else {
            statusMessage = `${studentCount} students found`;
        }

        // Loop (LO4)
        let totalMarksRecords = 0;
        for (let i = 0; i < this.students.length; i++) { // Loop
            totalMarksRecords += this.students[i].marks.length;
        }

        console.log("Programming Techniques Demo:", {
            hasStudents,
            canExport,
            statusMessage,
            totalMarksRecords
        });
    }

    // LO4: Custom function that returns value used as argument
    calculateOverallPerformance(student) {
        const marksAvg = student.marks.length > 0 ?
            student.marks.reduce((sum, mark) => sum + mark.percentage, 0) / student.marks.length : 0;

        const attendanceAvg = student.attendance.length > 0 ?
            student.attendance.reduce((sum, att) => sum + att.percentage, 0) / student.attendance.length : 0;

        // Return value that can be used as argument for another function
        return { marksAvg, attendanceAvg };
    }

    // LO4: Function that uses return value as argument
    getStudentPerformanceStatus(student) {
        // Using return value of calculateOverallPerformance as argument
        const performance = this.calculateOverallPerformance(student);
        return this.analyzePerformance(performance); // Function call with return value as argument
    }

    // LO4: Function that analyzes performance
    analyzePerformance({ marksAvg, attendanceAvg }) {
        if (marksAvg >= 80 && attendanceAvg >= 85) return "Excellent";
        if (marksAvg >= 70 && attendanceAvg >= 75) return "Good";
        if (marksAvg >= 60 && attendanceAvg >= 65) return "Average";
        return "Needs Improvement";
    }

    // LO5: Complex data structures demonstration
    demonstrateDataStructures() {
        // Array operations (LO5)
        const studentEmails = this.students.map(student => student.email);
        const highPerformers = this.students.filter(student => {
            const performance = this.calculateOverallPerformance(student);
            return performance.marksAvg > 75;
        });

        // Object operations (LO5)
        const studentSummary = this.students.map(student => {
            // Object with nested structures
            return {
                id: student.id,
                name: student.name,
                contact: {
                    email: student.email,
                    phone: student.phone
                },
                statistics: {
                    marksCount: student.marks.length,
                    attendanceCount: student.attendance.length,
                    performance: this.getStudentPerformanceStatus(student)
                }
            };
        });

        console.log("Data Structures Demo:", {
            studentEmails,
            highPerformers: highPerformers.length,
            studentSummary
        });
    }

    // LO7: DOM Manipulation Examples
    enhanceDOMManipulation() {
        // Modify properties across DOM elements
        const cards = document.querySelectorAll('.student-card');

        if (cards.length > 0) {
            // Modify first card
            if (cards[0]) {
                cards[0].style.transition = 'all 0.3s ease'; // Property 1
                cards[0].style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'; // Property 2
            }

            // Modify second card if exists
            if (cards[1]) {
                cards[1].style.border = '2px solid #007bff'; // Property 3
            }
        }

        // Add custom event handlers
        this.addCustomEventHandlers();
    }

    // LO8: Event Driven Programming
    addCustomEventHandlers() {
        // Event Handler 1: Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'n') {
                event.preventDefault();
                this.openStudentModal();
                toastr.info('Quick add: Student form opened!');
            }
        });

        // Event Handler 2: Double click to view details
        const studentList = document.getElementById('studentList');
        if (studentList) {
            studentList.addEventListener('dblclick', (event) => {
                const card = event.target.closest('.student-card');
                if (card) {
                    const buttons = card.querySelectorAll('button');
                    if (buttons[0]) buttons[0].click(); // Click manage button
                }
            });
        }

        console.log("Custom event handlers added");
    }

    // LO10: Asynchronous Operations Demo
    async demonstrateAsyncOperations() {
        try {
            // Simulate multiple async operations
            const [studentCount, marksCount, attendanceCount] = await Promise.all([
                this.getStudentCount(),
                this.getTotalMarksCount(),
                this.getTotalAttendanceCount()
            ]);

            return { studentCount, marksCount, attendanceCount };
        } catch (error) {
            console.error("Async operation failed:", error);
            return { studentCount: 0, marksCount: 0, attendanceCount: 0 };
        }
    }

    async getStudentCount() {
        return new Promise(resolve => {
            setTimeout(() => resolve(this.students.length), 100);
        });
    }

    async getTotalMarksCount() {
        return new Promise(resolve => {
            setTimeout(() => {
                const count = this.students.reduce((sum, student) => sum + student.marks.length, 0);
                resolve(count);
            }, 150);
        });
    }

    async getTotalAttendanceCount() {
        return new Promise(resolve => {
            setTimeout(() => {
                const count = this.students.reduce((sum, student) => sum + student.attendance.length, 0);
                resolve(count);
            }, 200);
        });
    }

    // Helper function for programming demo
    showProgrammingDemo(hasStudents, canExport, count) {
        if (hasStudents) {
            console.log(`System has ${count} students. Export available: ${canExport}`);
        }
    }

    // Initialize all demonstrations
    initializeAllDemonstrations() {
        setTimeout(() => {
            this.demonstrateProgrammingTechniques();
            this.demonstrateDataStructures();
            this.enhanceDOMManipulation();
            this.demonstrateAsyncOperations().then(result => {
                console.log("Async Operations Result:", result);
            });
        }, 2000);
    }
}
// Performance Monitoring and Assessment Requirements Demo
class PerformanceMonitor {
    constructor() {
        this.loadTime = Date.now();
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Track load performance
        window.addEventListener('load', () => {
            const loadTime = Date.now() - this.loadTime;
            console.log(`Page loaded in ${loadTime}ms`);

            // Create performance indicator
            this.createPerformanceIndicator(loadTime);
        });

        // Track user interactions
        this.trackUserInteractions();
    }

    createPerformanceIndicator(loadTime) {
        const indicator = document.createElement('div');
        indicator.className = 'performance-indicator';
        indicator.innerHTML = `⚡ ${loadTime}ms`;
        indicator.title = 'Page load time - for assessment demonstration';
        document.body.appendChild(indicator);

        // Remove after 5 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 1000);
        }, 5000);
    }

    trackUserInteractions() {
        let interactionCount = 0;

        // Count various user interactions
        const events = ['click', 'keydown', 'submit', 'change'];
        events.forEach(eventType => {
            document.addEventListener(eventType, () => {
                interactionCount++;
                console.log(`User interaction #${interactionCount}: ${eventType}`);
            });
        });
    }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Global function to demonstrate all requirements (for oral assessment)
function demonstrateAllRequirements() {
    console.group("🎓 Assessment Requirements Demonstration");

    // LO4: Programming Techniques
    console.log("✅ LO4: Programming Techniques");
    console.log("   - Comparison operators: studentCount > 0");
    console.log("   - Logical operators: hasStudents && isOnline");
    console.log("   - Function calls: calculateOverallPerformance()");
    console.log("   - Branching: if/else statements");
    console.log("   - Loops: for loop in demonstrateProgrammingTechniques()");
    console.log("   - Custom functions: analyzePerformance()");

    // LO5: Complex Data Structures
    console.log("✅ LO5: Complex Data Structures");
    console.log("   - Arrays: students[], marks[], attendance[]");
    console.log("   - Objects: student objects with nested structures");
    console.log("   - Array methods: map, filter, reduce");

    // LO6: Structured Programming
    console.log("✅ LO6: Structured Programming");
    console.log("   - Class-based architecture");
    console.log("   - Function return values used as arguments");
    console.log("   - Modular code organization");

    // LO7: DOM Manipulation
    console.log("✅ LO7: DOM Manipulation");
    console.log("   - DOM selection: querySelector, getElementById");
    console.log("   - Property modification: style, innerHTML");
    console.log("   - Dynamic element creation");

    // LO8: Event Driven Programming
    console.log("✅ LO8: Event Driven Programming");
    console.log("   - Click events for all buttons");
    console.log("   - Form submission events");
    console.log("   - Custom events: keyboard shortcuts, double-click");
    console.log("   - Input change events for calculations");

    // LO9: UI/UX Framework
    console.log("✅ LO9: UI/UX Framework");
    console.log("   - Mobile-responsive design");
    console.log("   - Color-coded performance indicators");
    console.log("   - Progress bars and visual feedback");
    console.log("   - Intuitive navigation and workflows");

    // LO10: Asynchronous Operations
    console.log("✅ LO10: Asynchronous Operations");
    console.log("   - Async/await for API calls");
    console.log("   - Promise handling");
    console.log("   - JSONBin integration");

    // LO11: AJAX Concepts
    console.log("✅ LO11: AJAX Concepts");
    console.log("   - Fetch API for HTTP requests");
    console.log("   - GET, POST, PUT requests to JSONBin");
    console.log("   - Asynchronous data loading");

    // LO12: RESTful API Consumption
    console.log("✅ LO12: RESTful API Consumption");
    console.log("   - JSONBin REST API integration");
    console.log("   - CRUD operations via API");
    console.log("   - Error handling and fallbacks");

    console.groupEnd();

    // Show demonstration in UI
    toastr.info('Check browser console for requirements demonstration!', 'Assessment Demo', { timeOut: 5000 });
}

// Make function available globally for testing
window.demonstrateAllRequirements = demonstrateAllRequirements;
window.performanceMonitor = performanceMonitor;
// Initialize the application
const studentManager = new StudentManager();
