const PROJECTS = [
  {
    id: "monkeyboy",
    label: "Monkey Boy",
    icon: "images/monkeyboy.jpg",
    repo: "https://github.com/Jamesha123/Monkey_Boy",
    repoLabel: "View Source on GitHub",
    bullets: [
      "2D Java adventure game with exploration, real-time combat, magic, quests, and boss battles",
      "Inventory, equipment, save/load, day/night lighting, and 14 playable maps",
      "Playable MonkeyBoy.jar download with bundled assets — double-click or run java -jar MonkeyBoy.jar (Java 8+)",
      "Includes build scripts, map editor, and full source recovered from the working JAR build",
    ],
  },
  {
    id: "compiler",
    label: "Compiler",
    icon: "images/compiler1.jpg",
    repo: "https://github.com/Jamesha123/Simple_Compiler",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Built a complete compiler from scratch using Lex (lexical analyzer) and Yacc (parser generator) with C backend",
      "Implemented full compilation pipeline: lexical analysis, syntax parsing, semantic analysis, and code generation",
      "Developed advanced code optimization algorithms including dead code elimination, constant folding, and register allocation",
      "Created support for multiple programming language constructs including variables, functions, loops, and conditional statements",
      "Designed efficient symbol table management and error handling with detailed diagnostic messages",
    ],
  },
  {
    id: "nws",
    label: "NWS Alert Subscriber",
    icon: "images/weather.jpg",
    repo: "https://github.com/Jamesha123/NWS_Alert_Subscription",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Built a comprehensive weather alert system integrating Amazon SNS for real-time notification delivery across 128+ weather zones",
      "Developed interactive web interface using AngularJS with leaflet integration for geolocation-based alert subscriptions",
      "Architected scalable backend using Java Spring Boot with MariaDB for user management and alert preference storage",
      "Implemented robust data processing pipeline using Jackson library to parse and transform NWS API responses",
      "Designed RESTful APIs for user registration, location-based subscriptions, and alert management with comprehensive error handling",
    ],
  },
  {
    id: "calculator",
    label: "Calculator",
    icon: "images/calculator.jpg",
    repo: "https://github.com/Jamesha123/Calculator",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Designed and implemented a fully functional scientific calculator using Java Swing with comprehensive mathematical operations",
      "Developed modular architecture with separation of concerns between UI components, business logic, and calculation engine",
      "Implemented comprehensive unit testing suite using JUnit with 95%+ code coverage for all mathematical operations",
      "Applied object-oriented design principles including encapsulation, inheritance, and polymorphism for maintainable code",
      "Created intuitive user interface with keyboard shortcuts, error handling, and memory functions",
    ],
  },
  {
    id: "book-recommender",
    label: "Book Recommender",
    icon: "images/book.jpg",
    repo: "https://github.com/Jamesha123/BookRecommender",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Full stack book recommendation app with Node.js/Express, MongoDB, JWT auth, and a responsive web UI",
      "Trained hybrid ML pipeline: TF-IDF content features, matrix-factorization collaborative signals, and a learned logistic ranker",
      "Model retrains automatically when users like, unlike, or dislike books; data persist in MongoDB",
      "Search Google Books, build a taste profile, queue next read titles, and get scored picks with similar taste",
      "Deduplication, edition filtering, API docs, Docker support, and Jest test coverage",
    ],
  },
  {
    id: "lists",
    label: "To Do Lists",
    icon: "images/lists.svg",
    repo: "https://github.com/Jamesha123/ToDoLists",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Real time collaborative to-do and grocery lists. Changes sync live for everyone via Server Sent Events, no refresh needed",
      "Zero dependency Node.js server (server.js + built-in modules only) with data.json persistence even after server restart",
      "Multi list support with categorized grocery subtopics, quantity tracking, and recipe import by url or copy and paste",
      "Portfolio includes a static browser demo (assets/lists-app/) that runs on GitHub Pages with localStorage",
    ],
  },
  {
    id: "pong",
    label: "Pong",
    icon: "images/pong.jpg",
    repo: "https://github.com/Jamesha123/Pong",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Created a classic Pong arcade game using Java with advanced physics simulation and collision detection algorithms",
      "Developed interactive web demo with HTML5 Canvas, featuring smooth animations and responsive touch controls",
      "Implemented AI opponent with three difficulty levels (Easy, Medium, Hard)",
    ],
  },
  {
    id: "snake",
    label: "Snake Game",
    icon: "images/Snake.jpg",
    repo: "https://github.com/Jamesha123/Snake",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Developed a complete Snake game implementation using Java with object-oriented design patterns and Swing GUI",
      "Created interactive web demo using HTML5 Canvas, CSS3, and vanilla JavaScript with responsive design",
      "Implemented cross-platform controls including keyboard input, touch gestures, and mobile-optimized swipe controls",
    ],
  },
  {
    id: "blackjack",
    label: "Blackjack",
    icon: "images/blackjack.jpg",
    repo: "https://github.com/Jamesha123/Blackjack",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Engineered a complete Blackjack game using Java with advanced card game mechanics and AI dealer logic",
      "Implemented sophisticated 6-deck shoe system with automatic reshuffling and realistic card dealing algorithms",
      "Developed comprehensive game state management including betting, hand evaluation, and multiple game rounds",
      "Built interactive web demo featuring HTML5 Canvas rendering, dynamic card animations, and responsive UI design",
    ],
  },
  {
    id: "hangman",
    label: "Hangman",
    icon: "images/hangman.jpg",
    repo: "https://github.com/Jamesha123/HangMan",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Engineered a complete Hangman word-guessing game using Java with comprehensive game logic and user interface",
      "Developed interactive web demo featuring HTML5 Canvas, dynamic word generation, and progressive visual feedback",
    ],
  },
  {
    id: "disassembler",
    label: "Disassembler",
    icon: "images/assembly.jpg",
    repo: "https://github.com/Jamesha123/Disassembler",
    repoLabel: "View Source on GitHub",
    bullets: [
      "Built a comprehensive binary disassembler in Go capable of parsing and analyzing executable machine code",
      "Implemented assembly code simulation engine with register management, memory addressing, and instruction execution",
      "Developed robust parsing algorithms for multiple instruction set architectures with detailed error reporting",
      "Learned Go programming language including goroutines, channels, and concurrent programming patterns",
      "Collaborated effectively in team environment using Git version control and agile development methodologies",
    ],
  },
];

const shell = document.getElementById("projects-shell");
const gridEl = document.getElementById("projects-grid");
const backBtn = document.getElementById("projects-back-btn");
const toolbarTitle = document.getElementById("projects-toolbar-title");
const detailHero = document.getElementById("projects-detail-hero");
const detailTitle = document.getElementById("projects-detail-title");
const detailList = document.getElementById("projects-detail-list");
const detailRepo = document.getElementById("projects-detail-repo");
let detailDemo = document.getElementById("projects-detail-demo");
let detailDemoFrame = document.getElementById("projects-detail-demo-frame");

let activeProject = null;

function isMobileDevice() {
  try {
    var win = window;
    while (win && win.parent && win !== win.parent) {
      win = win.parent;
      if (win.document.documentElement.classList.contains("mobile-user")) {
        return true;
      }
    }
  } catch (_error) {
    // Ignore cross-origin parent access errors.
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }

  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
}

function resolveDemoUrl(page) {
  return new URL(page, window.location.href).href;
}

function buildDemoFrameSrc(page) {
  if (!page) {
    return "";
  }

  const resolved = resolveDemoUrl(page);
  if (!isMobileDevice()) {
    return resolved;
  }

  return resolved + (resolved.includes("?") ? "&" : "?") + "mobile=1";
}

function ensureDemoElements() {
  if (detailDemo && detailDemoFrame) {
    return;
  }

  const detail = document.getElementById("projects-detail");
  const list = document.getElementById("projects-detail-list");
  if (!detail || !list) {
    return;
  }

  detailDemo = document.createElement("div");
  detailDemo.id = "projects-detail-demo";
  detailDemo.className = "projects-detail-demo";
  detailDemo.hidden = true;

  const label = document.createElement("p");
  label.className = "projects-detail-demo-label";
  label.textContent = "Live Demo";

  detailDemoFrame = document.createElement("iframe");
  detailDemoFrame.id = "projects-detail-demo-frame";
  detailDemoFrame.className = "projects-detail-demo-frame";
  detailDemoFrame.title = "Project demo";
  detailDemoFrame.setAttribute("scrolling", "no");

  detailDemo.appendChild(label);
  detailDemo.appendChild(detailDemoFrame);
  detail.insertBefore(detailDemo, list);
}

function setProjectDemo(project) {
  ensureDemoElements();

  if (!detailDemo || !detailDemoFrame) {
    return;
  }

  if (!project || !project.demo) {
    detailDemo.hidden = true;
    detailDemoFrame.src = "about:blank";
    return;
  }

  detailDemo.hidden = false;
  detailDemoFrame.title = project.label + " demo";
  detailDemoFrame.src = buildDemoFrameSrc(project.demo);
  window.requestAnimationFrame(function () {
    detailDemo.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function isSvgIcon(path) {
  return /\.svg($|\?)/i.test(path);
}

function renderGrid() {
  gridEl.innerHTML = "";

  PROJECTS.forEach(function (project) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "project-tile";
    tile.innerHTML =
      '<img src="' +
      escapeHtml(project.icon) +
      '" alt="" class="' +
      (isSvgIcon(project.icon) ? "is-svg" : "") +
      '">' +
      "<span>" +
      escapeHtml(project.label) +
      "</span>";
    tile.addEventListener("click", function () {
      openProject(project);
    });
    gridEl.appendChild(tile);
  });
}

function setDetailView(open) {
  shell.classList.toggle("is-detail", open);
  if (backBtn) {
    backBtn.hidden = !open;
  }
  toolbarTitle.textContent = open && activeProject ? activeProject.label : "Projects";
}

function openProject(project) {
  activeProject = project;
  setDetailView(true);

  detailHero.innerHTML =
    '<img src="' +
    escapeHtml(project.icon) +
    '" alt="" class="' +
    (isSvgIcon(project.icon) ? "is-svg" : "") +
    '">';
  detailTitle.textContent = project.label;
  detailList.innerHTML = project.bullets
    .map(function (bullet) {
      return "<li>" + escapeHtml(bullet) + "</li>";
    })
    .join("");
  detailRepo.href = project.repo;
  detailRepo.textContent = project.repoLabel;
  setProjectDemo(project);
}

function closeProject() {
  if (!activeProject) {
    return;
  }

  setProjectDemo(null);
  activeProject = null;
  setDetailView(false);
}

if (backBtn) {
  backBtn.addEventListener("click", function () {
    closeProject();
  });
}

window.__closeProjectDetail = closeProject;

renderGrid();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
