// --- Data Models --------------------------------------------------------

class User {
  constructor(id, name, email, password, role) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role; // 'client' or 'trainer'
  }
}

class GymClass {
  constructor(id, name, day, time) {
    this.id = id;
    this.name = name;
    this.day = day;
    this.time = time;
    this.trainerId = null;
    this.trainerHours = 0;
    this.memberIds = [];
  }
}

class GymState {
  constructor() {
    this.users = [];
    this.classes = [];
    this.currentUserId = null;
  }

  // --- Persistence --- 
  static load() {
    const raw = localStorage.getItem("gymState");
    if (!raw) return new GymState();
    const parsed = JSON.parse(raw);
    const state = new GymState();
    state.users = parsed.users || [];
    state.classes = parsed.classes || [];
    state.currentUserId = parsed.currentUserId || null;
    return state;
  }

  save() {
    localStorage.setItem("gymState", JSON.stringify(this));
  }

  // --- Users ---
  registerUser(name, email, password, role) {
    if (!name || !email || !password) {
      throw new Error("All fields are required.");
    }
    if (this.users.some((u) => u.email === email)) {
      throw new Error("Email already registered");
    }
    const id = "u_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const user = new User(id, name, email, password, role);
    this.users.push(user);
    this.save();
    return user;
  }

  login(email, password) {
    const user = this.users.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) throw new Error("Invalid credentials");
    this.currentUserId = user.id;
    this.save();
    return user;
  }

  logout() {
    this.currentUserId = null;
    this.save();
  }

  getCurrentUser() {
    return this.users.find((u) => u.id === this.currentUserId) || null;
  }

  getTrainers() {
    return this.users.filter((u) => u.role === "trainer");
  }

  // --- Classes ---
  addClass(name, day, time) {
    if (!name || !day || !time) {
      throw new Error("Please fill all class fields.");
    }
    const id = "c_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const gymClass = new GymClass(id, name, day, time);
    this.classes.push(gymClass);
    this.save();
    return gymClass;
  }

  assignTrainerToClass(classId, trainerId, hours) {
    const gymClass = this.classes.find((c) => c.id === classId);
    if (!gymClass) throw new Error("Class not found");
    const trainer = this.users.find(
      (u) => u.id === trainerId && u.role === "trainer"
    );
    if (!trainer) throw new Error("Trainer not found");
    const h = Number(hours);
    if (!h || h <= 0) throw new Error("Hours must be a positive number");
    gymClass.trainerId = trainerId;
    gymClass.trainerHours = (gymClass.trainerHours || 0) + h;
    this.save();
  }

  enrollMemberInClass(classId, memberId) {
    const gymClass = this.classes.find((c) => c.id === classId);
    if (!gymClass) throw new Error("Class not found");
    if (!gymClass.memberIds.includes(memberId)) {
      gymClass.memberIds.push(memberId);
      this.save();
    }
  }

  getClassesForMember(memberId) {
    return this.classes.filter((c) => c.memberIds.includes(memberId));
  }

  getTrainerHoursSummary() {
    const summary = {};
    for (const c of this.classes) {
      if (c.trainerId) {
        summary[c.trainerId] =
          (summary[c.trainerId] || 0) + (c.trainerHours || 0);
      }
    }
    return summary;
  }
}

// --- UI Controller ------------------------------------------------------

(function () {
  const state = GymState.load();

  // Elements
  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("app");
  const nav = document.getElementById("nav");
  const welcome = document.getElementById("welcome");
  const roleBadge = document.getElementById("roleBadge");
  const logoutBtn = document.getElementById("logoutBtn");

  const trainerPanel = document.getElementById("trainerPanel");
  const clientPanel = document.getElementById("clientPanel");

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtn");

  const regName = document.getElementById("regName");
  const regEmail = document.getElementById("regEmail");
  const regPassword = document.getElementById("regPassword");
  const regRole = document.getElementById("regRole");
  const registerBtn = document.getElementById("registerBtn");

  const classNameInput = document.getElementById("className");
  const classDayInput = document.getElementById("classDay");
  const classTimeInput = document.getElementById("classTime");
  const addClassBtn = document.getElementById("addClassBtn");

  const assignClassSelect = document.getElementById("assignClassSelect");
  const assignTrainerSelect = document.getElementById("assignTrainerSelect");
  const assignHoursInput = document.getElementById("assignHours");
  const assignTrainerBtn = document.getElementById("assignTrainerBtn");

  const classList = document.getElementById("classList");
  const trainerHoursSummaryDiv = document.getElementById(
    "trainerHoursSummary"
  );

  const clientClassList = document.getElementById("clientClassList");
  const clientEnrollments = document.getElementById("clientEnrollments");

  const heroLoginBtn = document.getElementById("heroLoginBtn");
  const heroRegisterBtn = document.getElementById("heroRegisterBtn");

  // --- Rendering helpers ---

  function renderNav() {
    const user = state.getCurrentUser();
    if (!user) {
      nav.classList.add("hidden");
      return;
    }
    nav.classList.remove("hidden");
    welcome.textContent = `Welcome, ${user.name}`;
    roleBadge.textContent = user.role.toUpperCase();
  }

  function renderPanels() {
    const user = state.getCurrentUser();
    if (!user) {
      trainerPanel.classList.add("hidden");
      clientPanel.classList.add("hidden");
      return;
    }

    if (user.role === "trainer") {
      trainerPanel.classList.remove("hidden");
      clientPanel.classList.remove("hidden");
    } else {
      trainerPanel.classList.add("hidden");
      clientPanel.classList.remove("hidden");
    }
  }

  function renderClassOptions() {
    assignClassSelect.innerHTML = "";
    state.classes.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.day} @ ${c.time})`;
      assignClassSelect.appendChild(opt);
    });

    assignTrainerSelect.innerHTML = "";
    state.getTrainers().forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      assignTrainerSelect.appendChild(opt);
    });
  }

  function renderClassListForTrainer() {
    classList.innerHTML = "";
    if (state.classes.length === 0) {
      classList.textContent = "No classes yet.";
      return;
    }

    state.classes.forEach((c) => {
      const div = document.createElement("div");
      div.className = "class-card";
      const trainer = state.users.find((u) => u.id === c.trainerId);
      const trainerName = trainer ? trainer.name : "Unassigned";
      div.innerHTML = `
        <strong>${c.name}</strong>
        <div class="class-meta">
          ${c.day} @ ${c.time}<br/>
          Trainer: ${trainerName}<br/>
          Hours: ${c.trainerHours || 0}<br/>
          Members: ${c.memberIds.length}
        </div>
      `;
      classList.appendChild(div);
    });
  }

  function renderTrainerHoursSummary() {
    trainerHoursSummaryDiv.innerHTML = "";
    const summary = state.getTrainerHoursSummary();
    const ids = Object.keys(summary);
    if (ids.length === 0) {
      trainerHoursSummaryDiv.textContent = "No trainer hours recorded yet.";
      return;
    }
    ids.forEach((trainerId) => {
      const trainer = state.users.find((u) => u.id === trainerId);
      const div = document.createElement("div");
      div.className = "class-card";
      div.textContent = `${trainer ? trainer.name : trainerId}: ${
        summary[trainerId]
      } hours`;
      trainerHoursSummaryDiv.appendChild(div);
    });
  }

  function renderClientClassList() {
    clientClassList.innerHTML = "";
    const user = state.getCurrentUser();
    if (!user) return;

    if (state.classes.length === 0) {
      clientClassList.textContent = "No classes available.";
      return;
    }

    state.classes.forEach((c) => {
      const div = document.createElement("div");
      div.className = "class-card";
      const trainer = state.users.find((u) => u.id === c.trainerId);
      const trainerName = trainer ? trainer.name : "TBA";
      const isEnrolled = c.memberIds.includes(user.id);

      const btn = document.createElement("button");
      btn.className = "btn-3d small";
      btn.textContent = isEnrolled ? "Enrolled" : "Sign Up";
      btn.disabled = isEnrolled;
      btn.addEventListener("click", () => {
        state.enrollMemberInClass(c.id, user.id);
        renderClientClassList();
        renderClientEnrollments();
      });

      div.innerHTML = `
        <strong>${c.name}</strong>
        <div class="class-meta">
          ${c.day} @ ${c.time}<br/>
          Trainer: ${trainerName}<br/>
          Members: ${c.memberIds.length}
        </div>
      `;
      div.appendChild(btn);
      clientClassList.appendChild(div);
    });
  }

  function renderClientEnrollments() {
    clientEnrollments.innerHTML = "";
    const user = state.getCurrentUser();
    if (!user) return;

    const enrolled = state.getClassesForMember(user.id);
    if (enrolled.length === 0) {
      clientEnrollments.textContent = "You are not enrolled in any classes.";
      return;
    }

    enrolled.forEach((c) => {
      const div = document.createElement("div");
      div.className = "class-card";
      div.innerHTML = `
        <strong>${c.name}</strong>
        <div class="class-meta">
          ${c.day} @ ${c.time}
        </div>
      `;
      clientEnrollments.appendChild(div);
    });
  }

  function renderAll() {
    const user = state.getCurrentUser();
    if (user) {
      authSection.classList.add("hidden");
      appSection.classList.remove("hidden");
    } else {
      authSection.classList.remove("hidden");
      appSection.classList.add("hidden");
    }
    renderNav();
    renderPanels();
    renderClassOptions();
    renderClassListForTrainer();
    renderTrainerHoursSummary();
    renderClientClassList();
    renderClientEnrollments();
  }

  // --- Event bindings ---

  loginBtn.addEventListener("click", () => {
    try {
      state.login(loginEmail.value.trim(), loginPassword.value.trim());
      loginEmail.value = "";
      loginPassword.value = "";
      renderAll();
      scrollToPortal();
    } catch (e) {
      alert(e.message);
    }
  });

  registerBtn.addEventListener("click", () => {
    try {
      state.registerUser(
        regName.value.trim(),
        regEmail.value.trim(),
        regPassword.value.trim(),
        regRole.value
      );
      alert("Registered! You can now log in.");
      regName.value = "";
      regEmail.value = "";
      regPassword.value = "";
      regRole.value = "client";
      renderAll();
      scrollToPortal();
    } catch (e) {
      alert(e.message);
    }
  });

  logoutBtn.addEventListener("click", () => {
    state.logout();
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  addClassBtn.addEventListener("click", () => {
    try {
      state.addClass(
        classNameInput.value.trim(),
        classDayInput.value.trim(),
        classTimeInput.value.trim()
      );
      classNameInput.value = "";
      classDayInput.value = "";
      classTimeInput.value = "";
      renderAll();
    } catch (e) {
      alert(e.message);
    }
  });

  assignTrainerBtn.addEventListener("click", () => {
    const classId = assignClassSelect.value;
    const trainerId = assignTrainerSelect.value;
    const hours = assignHoursInput.value;
    try {
      state.assignTrainerToClass(classId, trainerId, hours);
      assignHoursInput.value = "";
      renderAll();
    } catch (e) {
      alert(e.message);
    }
  });

  heroLoginBtn.addEventListener("click", () => {
    scrollToPortal();
  });

  heroRegisterBtn.addEventListener("click", () => {
    scrollToPortal();
  });

  function scrollToPortal() {
    const portal = document.querySelector(".portal");
    if (!portal) return;
    portal.scrollIntoView({ behavior: "smooth" });
  }

  // Initial render
  renderAll();

  // Expose for debugging if you want in console
  window.__gymState = state;
})();
