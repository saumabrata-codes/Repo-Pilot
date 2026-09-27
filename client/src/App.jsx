import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  FileCode2,
  FolderGit2,
  GitBranch,
  Github,
  Info,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  UploadCloud,
  XCircle,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:3000";

const SUGGESTED_QUESTIONS = [
  "Where is authentication handled?",
  "What is the main entry point?",
  "How does the frontend communicate with the backend?",
  "Where is the database connection configured?",
  "How do I start this project?",
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [repositoryId, setRepositoryId] = useState("");
  const [repository, setRepository] = useState(null);

  const [analysisState, setAnalysisState] = useState("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");

  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD SAVED REPOSITORY FROM LOCAL STORAGE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const savedRepositoryId = localStorage.getItem(
      "repopilot_repository_id"
    );

    const savedRepositoryUrl = localStorage.getItem(
      "repopilot_repository_url"
    );

    if (savedRepositoryId) {
      setRepositoryId(savedRepositoryId);
    }

    if (savedRepositoryUrl) {
      setRepositoryUrl(savedRepositoryUrl);
    }

    if (savedRepositoryId) {
      loadRepository(savedRepositoryId, false);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  function navigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
    setError("");
  }

  /*
   * ---------------------------------------------------------
   * EXTRACT REPOSITORY ID FROM API RESPONSE
   * ---------------------------------------------------------
   */

  function extractRepositoryId(data) {
    return (
      data?.repositoryId ||
      data?.id ||
      data?.repository?.id ||
      data?.analysis?.repositoryId ||
      data?.data?.repositoryId ||
      null
    );
  }

  /*
   * ---------------------------------------------------------
   * ANALYZE REPOSITORY
   * ---------------------------------------------------------
   */

  async function analyzeRepository() {
    const url = repositoryUrl.trim();

    if (!url) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    setError("");
    setRepository(null);
    setMessages([]);
    setAnalysisState("analyzing");
    setAnalysisMessage("Starting repository analysis...");

    try {
      const response = await fetch(
        `${API_BASE}/api/repository/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            githubUrl: url,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Repository analysis failed."
        );
      }

      const id = extractRepositoryId(data);

      if (!id) {
        throw new Error(
          "The backend did not return a repository ID."
        );
      }

      setRepositoryId(id);

      localStorage.setItem(
        "repopilot_repository_id",
        id
      );

      localStorage.setItem(
        "repopilot_repository_url",
        url
      );

      /*
       * The backend may return 202 while analysis continues.
       * Poll status until the repository becomes completed.
       */

      await waitForAnalysis(id);

      await loadRepository(id, true);

      setAnalysisState("completed");
      setAnalysisMessage(
        "Repository analysis completed successfully."
      );

      navigate("Repository");
    } catch (err) {
      setAnalysisState("error");

      setAnalysisMessage("");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze repository."
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * WAIT FOR ANALYSIS
   * ---------------------------------------------------------
   */

  async function waitForAnalysis(id) {
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setAnalysisMessage(
        `Analyzing repository... ${
          attempt + 1
        }/${maxAttempts}`
      );

      try {
        const response = await fetch(
          `${API_BASE}/api/repository/${id}/status`
        );

        if (response.ok) {
          const data = await response.json();

          const status =
            data?.status ||
            data?.analysis?.status ||
            data?.repository?.analysis?.status;

          if (
            status === "completed" ||
            status === "complete" ||
            status === "success"
          ) {
            return;
          }

          if (
            status === "failed" ||
            status === "error"
          ) {
            throw new Error(
              data?.message ||
                "Repository analysis failed."
            );
          }
        }
      } catch (err) {
        /*
         * If the status endpoint is temporarily unavailable,
         * continue for a few attempts instead of immediately
         * failing the entire workflow.
         */
        if (attempt > 5) {
          throw err;
        }
      }

      await sleep(1500);
    }

    /*
     * Even if the status endpoint doesn't explicitly return
     * completed, try loading the repository.
     */
  }

  /*
   * ---------------------------------------------------------
   * LOAD REPOSITORY
   * ---------------------------------------------------------
   */

  async function loadRepository(id = repositoryId, showError = true) {
    if (!id) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/repository/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load repository."
        );
      }

      /*
       * Backend can return the repository directly or
       * inside a repository property.
       */

      const repo = data?.repository || data;

      setRepository(repo);

      if (repo?.source?.url) {
        setRepositoryUrl(repo.source.url);
        localStorage.setItem(
          "repopilot_repository_url",
          repo.source.url
        );
      }

      return repo;
    } catch (err) {
      if (showError) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load repository."
        );
      }

      return null;
    }
  }

  /*
   * ---------------------------------------------------------
   * ASK REPOPILOT
   * ---------------------------------------------------------
   */

  async function askRepoPilot(customQuestion = null) {
    const currentQuestion = (
      customQuestion !== null
        ? customQuestion
        : question
    ).trim();

    if (!currentQuestion) {
      return;
    }

    if (!repositoryId) {
      setError(
        "Please analyze a repository before asking RepoPilot."
      );
      return;
    }

    if (asking) {
      return;
    }

    setError("");
    setAsking(true);

    /*
     * Add user message immediately.
     */

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        type: "user",
        text: currentQuestion,
      },
    ]);

    setQuestion("");

    try {
      const response = await fetch(
        `${API_BASE}/api/repository/${repositoryId}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "RepoPilot could not answer the question."
        );
      }

      const assistantMessage = {
        id: Date.now() + 1,
        type: "assistant",
        text:
          data?.summary ||
          "I couldn't find enough repository evidence to answer this confidently.",
        relevantFiles:
          data?.relevantFiles || [],
        evidence:
          data?.evidence || [],
        flow:
          data?.flow || [],
        confidence:
          typeof data?.confidence === "number"
            ? data.confidence
            : 0,
        bobUsed:
          data?.bobUsed === true,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          type: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong while asking RepoPilot.",
          relevantFiles: [],
          evidence: [],
          flow: [],
          confidence: 0,
          bobUsed: false,
          error: true,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * RESET REPOSITORY
   * ---------------------------------------------------------
   */

  function resetRepository() {
    setRepository(null);
    setRepositoryId("");
    setRepositoryUrl("");
    setMessages([]);
    setAnalysisState("idle");
    setAnalysisMessage("");
    setError("");

    localStorage.removeItem(
      "repopilot_repository_id"
    );

    localStorage.removeItem(
      "repopilot_repository_url"
    );

    navigate("Dashboard");
  }

  /*
   * ---------------------------------------------------------
   * KEYBOARD SHORTCUT
   * ---------------------------------------------------------
   */

  function handleQuestionKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      askRepoPilot();
    }
  }

  /*
   * ---------------------------------------------------------
   * CURRENT REPOSITORY NAME
   * ---------------------------------------------------------
   */

  const repositoryName = useMemo(() => {
    return (
      repository?.repository?.name ||
      repository?.name ||
      getRepositoryNameFromUrl(repositoryUrl) ||
      "No repository"
    );
  }, [repository, repositoryUrl]);

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="app-shell">

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <Sidebar
        activePage={activePage}
        navigate={navigate}
        repository={repository}
        mobileOpen={sidebarOpen}
      />

      {/* MAIN */}

      <main className="main-area">

        {/* TOP BAR */}

        <header className="topbar">

          <button
            className="mobile-menu-button"
            onClick={() =>
              setSidebarOpen((value) => !value)
            }
          >
            <MessageSquare size={18} />
          </button>

          <div className="breadcrumb">
            <span>RepoPilot</span>
            <ChevronRight size={14} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">

            {repository && (
              <div className="repository-pill">
                <Github size={14} />
                <span>{repositoryName}</span>
              </div>
            )}

            <div className="online-pill">
              <span className="online-dot" />
              Backend Online
            </div>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="global-error">
            <AlertCircle size={17} />
            <span>{error}</span>

            <button
              onClick={() => setError("")}
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* PAGE CONTENT */}

        {activePage === "Dashboard" && (
          <Dashboard
            repository={repository}
            repositoryUrl={repositoryUrl}
            setRepositoryUrl={setRepositoryUrl}
            analyzeRepository={analyzeRepository}
            analysisState={analysisState}
            analysisMessage={analysisMessage}
            navigate={navigate}
            resetRepository={resetRepository}
          />
        )}

        {activePage === "Repository" && (
          <RepositoryPage
            repository={repository}
            repositoryUrl={repositoryUrl}
            loadRepository={loadRepository}
            resetRepository={resetRepository}
          />
        )}

        {activePage === "Architecture" && (
          <ArchitecturePage
            repository={repository}
          />
        )}

        {activePage === "Setup" && (
          <SetupPage
            repository={repository}
          />
        )}

        {activePage === "Ask RepoPilot" && (
          <AskRepoPilot
            repository={repository}
            messages={messages}
            question={question}
            setQuestion={setQuestion}
            asking={asking}
            askRepoPilot={askRepoPilot}
            handleQuestionKeyDown={
              handleQuestionKeyDown
            }
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  activePage,
  navigate,
  repository,
  mobileOpen,
}) {
  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Repository",
      icon: FolderGit2,
    },
    {
      name: "Architecture",
      icon: Boxes,
    },
    {
      name: "Setup",
      icon: Terminal,
    },
    {
      name: "Ask RepoPilot",
      icon: MessageCircle,
      ai: true,
    },
  ];

  return (
    <aside
      className={`sidebar ${
        mobileOpen ? "sidebar-open" : ""
      }`}
    >

      <div className="brand">

        <div className="brand-logo">
          <Sparkles size={21} />
        </div>

        <div className="brand-text">
          <strong>RepoPilot</strong>
          <span>Developer Intelligence</span>
        </div>
      </div>

      <div className="sidebar-label">
        WORKSPACE
      </div>

      <nav className="sidebar-nav">

        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            activePage === item.name;

          return (
            <button
              key={item.name}
              className={`sidebar-item ${
                active ? "sidebar-item-active" : ""
              }`}
              onClick={() => navigate(item.name)}
            >
              <Icon size={18} />

              <span>{item.name}</span>

              {item.ai && (
                <small className="ai-label">
                  AI
                </small>
              )}
            </button>
          );
        })}

      </nav>

      <div className="sidebar-bottom">

        <div className="assistant-card">

          <div className="assistant-card-icon">
            <Bot size={17} />
          </div>

          <div>
            <strong>RepoPilot AI</strong>
            <span>
              Evidence-grounded assistant
            </span>
          </div>

        </div>

        <div className="sidebar-status">
          <span className="online-dot" />
          System operational
        </div>

      </div>
    </aside>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  repository,
  repositoryUrl,
  setRepositoryUrl,
  analyzeRepository,
  analysisState,
  analysisMessage,
  navigate,
  resetRepository,
}) {
  return (
    <div className="page">

      <section className="hero-section">

        <div className="hero-content">

          <div className="eyebrow">
            <Sparkles size={14} />
            AI-POWERED DEVELOPER ONBOARDING
          </div>

          <h1>
            Understand any
            <br />
            <span>repository faster.</span>
          </h1>

          <p>
            RepoPilot analyzes your repository,
            maps its architecture, explains setup,
            and lets developers ask questions about
            the codebase using evidence.
          </p>

          <div className="hero-features">

            <div>
              <CheckCircle2 size={15} />
              Repository analysis
            </div>

            <div>
              <CheckCircle2 size={15} />
              Architecture mapping
            </div>

            <div>
              <CheckCircle2 size={15} />
              AI code assistant
            </div>

          </div>

        </div>

        <div className="hero-visual">

          <div className="hero-ring ring-large" />
          <div className="hero-ring ring-medium" />
          <div className="hero-ring ring-small" />

          <div className="hero-core">
            <Bot size={38} />
          </div>

          <div className="floating-node node-one">
            <Code2 size={16} />
          </div>

          <div className="floating-node node-two">
            <Database size={16} />
          </div>

          <div className="floating-node node-three">
            <GitBranch size={16} />
          </div>

        </div>

      </section>

      <section className="connect-section">

        <div className="section-header">

          <div className="section-header-icon">
            <Github size={21} />
          </div>

          <div>
            <h2>
              Connect your repository
            </h2>

            <p>
              Paste a public GitHub repository URL
              to begin.
            </p>
          </div>

        </div>

        <div className="repository-input-row">

          <div className="repository-input">

            <Github size={18} />

            <input
              type="text"
              value={repositoryUrl}
              placeholder="https://github.com/username/repository"
              onChange={(event) =>
                setRepositoryUrl(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  analyzeRepository();
                }
              }}
            />

            {repositoryUrl && (
              <button
                className="clear-input"
                onClick={() =>
                  setRepositoryUrl("")
                }
              >
                <XCircle size={15} />
              </button>
            )}

          </div>

          <button
            className="primary-button"
            onClick={analyzeRepository}
            disabled={
              analysisState === "analyzing"
            }
          >

            {analysisState ===
            "analyzing" ? (
              <>
                <Loader2
                  size={16}
                  className="spin"
                />
                Analyzing...
              </>
            ) : (
              <>
                <Search size={16} />
                Analyze Repository
              </>
            )}

          </button>

        </div>

        {analysisState ===
          "analyzing" && (
          <div className="analysis-progress">

            <div className="progress-icon">
              <Loader2
                size={18}
                className="spin"
              />
            </div>

            <div className="progress-content">

              <strong>
                Repository analysis in progress
              </strong>

              <span>
                {analysisMessage ||
                  "Inspecting repository..."}
              </span>

              <div className="progress-track">
                <div className="progress-bar" />
              </div>

            </div>

          </div>
        )}

        {analysisState ===
          "completed" && (
          <div className="success-message">
            <CheckCircle2 size={17} />

            <span>
              Repository analyzed successfully.
            </span>
          </div>
        )}

      </section>

      {repository && (
        <>
          <section className="stats-grid">

            <StatCard
              icon={<FileCode2 size={19} />}
              label="Total Files"
              value={
                repository.statistics
                  ?.fileCount ??
                repository.structure
                  ?.fileCount ??
                0
              }
            />

            <StatCard
              icon={<Code2 size={19} />}
              label="Source Files"
              value={
                repository.statistics
                  ?.sourceFileCount ??
                0
              }
            />

            <StatCard
              icon={<GitBranch size={19} />}
              label="Branch"
              value={
                repository.source?.branch ||
                "main"
              }
            />

            <StatCard
              icon={<Activity size={19} />}
              label="Analysis"
              value={
                repository.analysis
                  ?.status ||
                "Completed"
              }
            />

          </section>

          <section className="quick-section">

            <div className="section-title-row">
              <div>
                <h2>
                  Explore your repository
                </h2>

                <p>
                  Continue exploring the codebase
                  with RepoPilot.
                </p>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  navigate("Repository")
                }
              >
                Open repository
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="quick-grid">

              <QuickCard
                icon={<FolderGit2 size={20} />}
                title="Repository"
                description="View files, languages, tests and repository statistics."
                onClick={() =>
                  navigate("Repository")
                }
              />

              <QuickCard
                icon={<Boxes size={20} />}
                title="Architecture"
                description="Explore detected project structure and architecture."
                onClick={() =>
                  navigate("Architecture")
                }
              />

              <QuickCard
                icon={<MessageSquare size={20} />}
                title="Ask RepoPilot"
                description="Ask questions and receive evidence-backed answers."
                onClick={() =>
                  navigate("Ask RepoPilot")
                }
              />

            </div>

          </section>

          <button
            className="danger-outline-button"
            onClick={resetRepository}
          >
            <RefreshCw size={14} />
            Analyze another repository
          </button>
        </>
      )}

    </div>
  );
}

/* =========================================================
   REPOSITORY PAGE
========================================================= */

function RepositoryPage({
  repository,
  repositoryUrl,
  loadRepository,
  resetRepository,
}) {
  if (!repository) {
    return (
      <EmptyState
        icon={<FolderGit2 size={28} />}
        title="No repository loaded"
        description="Return to Dashboard and analyze a GitHub repository first."
      />
    );
  }

  const files =
    repository.structure?.files || [];

  const languages =
    repository.technology?.languages || [];

  return (
    <div className="page">

      <PageHeader
        eyebrow="REPOSITORY"
        title={
          repository.repository?.name ||
          repository.name ||
          "Repository"
        }
        description={
          repository.repository?.description ||
          "Repository overview and analysis results."
        }
      />

      <div className="repository-meta">

        <div>
          <Github size={15} />
          <span>
            {repositoryUrl ||
              repository.source?.url ||
              "GitHub repository"}
          </span>
        </div>

        <div>
          <GitBranch size={15} />
          <span>
            {repository.source?.branch ||
              "main"}
          </span>
        </div>

        <div>
          <CheckCircle2 size={15} />
          <span>
            Analysis completed
          </span>
        </div>

      </div>

      <div className="two-column-grid">

        <div className="panel">

          <PanelHeader
            title="Technologies"
            description="Languages detected in the repository."
          />

          {languages.length > 0 ? (
            <div className="technology-list">
              {languages.map(
                (language, index) => (
                  <div
                    className="technology-row"
                    key={
                      language.language ||
                      index
                    }
                  >
                    <div className="technology-icon">
                      <Code2 size={16} />
                    </div>

                    <div className="technology-name">
                      <strong>
                        {language.language}
                      </strong>

                      <span>
                        {language.fileCount} files
                      </span>
                    </div>

                    <ChevronRight
                      size={14}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyInline text="No language information detected." />
          )}

        </div>

        <div className="panel">

          <PanelHeader
            title="Project information"
            description="Repository analysis summary."
          />

          <div className="info-grid">

            <InfoItem
              label="Project type"
              value={
                repository.technology
                  ?.projectType
                  ?.type ||
                "Unknown"
              }
            />

            <InfoItem
              label="Visibility"
              value={
                repository.repository
                  ?.visibility ||
                "Unknown"
              }
            />

            <InfoItem
              label="Tests"
              value={
                repository.tests
                  ?.testFileCount ??
                repository.statistics
                  ?.testFileCount ??
                0
              }
            />

            <InfoItem
              label="README"
              value={
                repository.documentation
                  ?.hasReadme
                  ? "Available"
                  : "Not detected"
              }
            />

          </div>

        </div>

      </div>

      <div className="panel repository-files-panel">

        <PanelHeader
          title="Repository structure"
          description={`${files.length} files detected.`}
          action={
            <button
              className="small-button"
              onClick={() =>
                loadRepository()
              }
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          }
        />

        <div className="file-table">

          {files.length > 0 ? (
            files.map((file) => (
              <div
                className="file-table-row"
                key={file.path}
              >

                <FileCode2
                  size={16}
                />

                <span className="file-path">
                  {file.path}
                </span>

                <span className="file-extension">
                  {file.extension ||
                    "file"}
                </span>

                <span className="file-size">
                  {formatBytes(
                    file.sizeBytes
                  )}
                </span>

              </div>
            ))
          ) : (
            <EmptyInline text="No repository files were detected." />
          )}

        </div>

      </div>

      <div className="panel evidence-panel">

        <PanelHeader
          title="Analyzer evidence"
          description="Evidence recorded by the repository analyzer."
        />

        {repository.evidence?.length >
        0 ? (
          <div className="analyzer-evidence-list">

            {repository.evidence.map(
              (item, index) => (
                <div
                  className="analyzer-evidence-item"
                  key={index}
                >
                  <CheckCircle2
                    size={15}
                  />

                  <div>
                    <strong>
                      {item.type ||
                        "Evidence"}
                    </strong>

                    <span>
                      {item.description ||
                        item.source ||
                        "Repository evidence detected"}
                    </span>
                  </div>
                </div>
              )
            )}

          </div>
        ) : (
          <EmptyInline text="No additional evidence available." />
        )}

      </div>

      <button
        className="danger-outline-button"
        onClick={resetRepository}
      >
        <RefreshCw size={14} />
        Analyze another repository
      </button>

    </div>
  );
}

/* =========================================================
   ARCHITECTURE PAGE
========================================================= */

function ArchitecturePage({
  repository,
}) {
  if (!repository) {
    return (
      <EmptyState
        icon={<Boxes size={28} />}
        title="Architecture unavailable"
        description="Analyze a repository before viewing architecture information."
      />
    );
  }

  const files =
    repository.structure?.files || [];

  const entryPoints =
    repository.entryPoints || [];

  return (
    <div className="page">

      <PageHeader
        eyebrow="ARCHITECTURE"
        title="Understand the codebase"
        description="Explore the architecture and structural information detected by RepoPilot."
      />

      <div className="architecture-flow">

        <ArchitectureNode
          icon={<Github size={20} />}
          title={
            repository.repository
              ?.name ||
            "Repository"
          }
          subtitle="Source repository"
        />

        <ArrowConnector />

        <ArchitectureNode
          icon={<Search size={20} />}
          title="Repository Analyzer"
          subtitle="Codebase analysis"
        />

        <ArrowConnector />

        <ArchitectureNode
          icon={<Bot size={20} />}
          title="RepoPilot AI"
          subtitle="Developer assistant"
        />

      </div>

      <div className="two-column-grid">

        <div className="panel">

          <PanelHeader
            title="Project type"
            description="Detected project classification."
          />

          <div className="project-type-box">

            <div className="project-type-icon">
              <Boxes size={21} />
            </div>

            <div>
              <strong>
                {repository.technology
                  ?.projectType
                  ?.type ||
                  "Unknown project type"}
              </strong>

              <span>
                Confidence:{" "}
                {repository.technology
                  ?.projectType
                  ?.confidence ||
                  "low"}
              </span>
            </div>

          </div>

        </div>

        <div className="panel">

          <PanelHeader
            title="Entry points"
            description="Detected application entry points."
          />

          {entryPoints.length >
          0 ? (
            <div className="simple-list">

              {entryPoints.map(
                (entry, index) => (
                  <div
                    className="simple-list-item"
                    key={index}
                  >
                    <Play size={14} />

                    <span>
                      {typeof entry ===
                      "string"
                        ? entry
                        : entry?.path ||
                          entry?.name ||
                          JSON.stringify(
                            entry
                          )}
                    </span>
                  </div>
                )
              )}

            </div>
          ) : (
            <EmptyInline text="No entry points were detected." />
          )}

        </div>

      </div>

      <div className="panel">

        <PanelHeader
          title="Structure map"
          description={`${files.length} repository files.`}
        />

        <div className="structure-grid">

          {files.length > 0 ? (
            files.map((file) => (
              <div
                className="structure-card"
                key={file.path}
              >
                <FileCode2
                  size={15}
                />

                <span>
                  {file.path}
                </span>
              </div>
            ))
          ) : (
            <EmptyInline text="No files available." />
          )}

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   SETUP PAGE
========================================================= */

function SetupPage({
  repository,
}) {
  if (!repository) {
    return (
      <EmptyState
        icon={<Terminal size={28} />}
        title="Setup information unavailable"
        description="Analyze a repository first to inspect setup information."
      />
    );
  }

  const configFiles =
    repository.configuration
      ?.configFiles || [];

  const environmentFiles =
    repository.configuration
      ?.environmentExampleFiles ||
    [];

  const limitations =
    repository.limitations || [];

  return (
    <div className="page">

      <PageHeader
        eyebrow="DEVELOPER SETUP"
        title="Get started with the project"
        description="Repository setup information discovered during analysis."
      />

      <div className="setup-grid">

        <SetupStep
          number="01"
          icon={<Github size={18} />}
          title="Clone repository"
          description="Start by cloning the repository."
        >
          <div className="code-block">
            git clone{" "}
            {repository.source?.url ||
              "https://github.com/username/repository.git"}
          </div>
        </SetupStep>

        <SetupStep
          number="02"
          icon={<Settings size={18} />}
          title="Configuration"
          description="Configuration files detected in the project."
        >
          {configFiles.length >
          0 ? (
            <div className="setup-file-list">
              {configFiles.map(
                (file, index) => (
                  <div
                    key={index}
                  >
                    <Settings
                      size={13}
                    />
                    {file}
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyInline text="No configuration files detected." />
          )}
        </SetupStep>

        <SetupStep
          number="03"
          icon={<Terminal size={18} />}
          title="Environment"
          description="Environment example files detected."
        >
          {environmentFiles.length >
          0 ? (
            <div className="setup-file-list">
              {environmentFiles.map(
                (file, index) => (
                  <div
                    key={index}
                  >
                    <Settings
                      size={13}
                    />
                    {file}
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyInline text="No environment example files detected." />
          )}
        </SetupStep>

      </div>

      <div className="panel">

        <PanelHeader
          title="Analyzer limitations"
          description="Information the analyzer could not determine automatically."
        />

        {limitations.length >
        0 ? (
          <div className="limitations">

            {limitations.map(
              (item, index) => (
                <div
                  className="limitation"
                  key={index}
                >
                  <AlertCircle
                    size={16}
                  />

                  <div>
                    <strong>
                      {item.code ||
                        "Limitation"}
                    </strong>

                    <span>
                      {item.message}
                    </span>
                  </div>
                </div>
              )
            )}

          </div>
        ) : (
          <div className="success-message">
            <CheckCircle2
              size={16}
            />
            No analyzer limitations were reported.
          </div>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   ASK REPOPILOT
========================================================= */

function AskRepoPilot({
  repository,
  messages,
  question,
  setQuestion,
  asking,
  askRepoPilot,
  handleQuestionKeyDown,
}) {
  if (!repository) {
    return (
      <EmptyState
        icon={<MessageCircle size={28} />}
        title="Ask RepoPilot"
        description="Analyze a repository first. Then ask questions about its codebase."
      />
    );
  }

  return (
    <div className="page ask-page">

      <PageHeader
        eyebrow="REPOSITORY AI"
        title="Ask RepoPilot"
        description="Ask questions about the repository and get answers grounded in repository evidence."
      />

      <div className="chat-layout">

        {/* CHAT */}

        <section className="chat-container">

          <div className="chat-header">

            <div className="chat-avatar">
              <Bot size={20} />
            </div>

            <div className="chat-title">

              <strong>
                RepoPilot Assistant
              </strong>

              <span>
                Repository-aware AI assistant
              </span>

            </div>

            <div className="bob-ready">
              <span className="online-dot" />
              IBM Bob
            </div>

          </div>

          <div className="chat-messages">

            {messages.length === 0 ? (
              <ChatWelcome
                askRepoPilot={askRepoPilot}
              />
            ) : (
              messages.map(
                (message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                  />
                )
              )
            )}

            {asking && (
              <div className="assistant-message-row">

                <div className="message-avatar">
                  <Bot size={15} />
                </div>

                <div className="typing-box">

                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>

                  <span>
                    RepoPilot is searching
                    the repository...
                  </span>

                </div>

              </div>
            )}

          </div>

          <div className="chat-input-area">

            <div className="chat-input">

              <MessageSquare
                size={17}
              />

              <input
                type="text"
                value={question}
                placeholder="Ask about the repository..."
                disabled={asking}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleQuestionKeyDown
                }
              />

              <button
                className="send-button"
                disabled={
                  asking ||
                  !question.trim()
                }
                onClick={() =>
                  askRepoPilot()
                }
              >
                <ArrowRight size={17} />
              </button>

            </div>

            <div className="chat-input-footer">
              <span>
                Press Enter to ask
              </span>

              <span>
                Answers are grounded in repository evidence
              </span>
            </div>

          </div>

        </section>

        {/* CHAT INFORMATION */}

        <aside className="chat-side">

          <div className="panel">

            <PanelHeader
              title="How it works"
              description="RepoPilot follows a grounded workflow."
            />

            <div className="workflow">

              <WorkflowStep
                number="01"
                title="Analyze question"
                icon={<Search size={14} />}
              />

              <WorkflowStep
                number="02"
                title="Search repository"
                icon={<FolderGit2 size={14} />}
              />

              <WorkflowStep
                number="03"
                title="Find evidence"
                icon={<FileCode2 size={14} />}
              />

              <WorkflowStep
                number="04"
                title="Rank evidence"
                icon={<Activity size={14} />}
              />

              <WorkflowStep
                number="05"
                title="Generate answer"
                icon={<Bot size={14} />}
              />

            </div>

          </div>

          <div className="trust-card">

            <div className="trust-icon">
              <ShieldCheck size={21} />
            </div>

            <h3>
              Evidence grounded
            </h3>

            <p>
              RepoPilot uses repository
              evidence before generating
              an answer.
            </p>

            <div className="trust-line">
              <CheckCircle2 size={13} />
              No repository evidence = no confident answer
            </div>

          </div>

          <div className="panel">

            <PanelHeader
              title="Suggested questions"
              description="Try one of these."
            />

            <div className="side-suggestions">

              {SUGGESTED_QUESTIONS.map(
                (item) => (
                  <button
                    key={item}
                    onClick={() =>
                      askRepoPilot(item)
                    }
                  >
                    <span>
                      {item}
                    </span>
                    <ChevronRight
                      size={13}
                    />
                  </button>
                )
              )}

            </div>

          </div>

        </aside>

      </div>

    </div>
  );
}

/* =========================================================
   CHAT WELCOME
========================================================= */

function ChatWelcome({
  askRepoPilot,
}) {
  return (
    <div className="chat-welcome">

      <div className="chat-welcome-icon">
        <Sparkles size={27} />
      </div>

      <h2>
        Ask anything about your codebase
      </h2>

      <p>
        RepoPilot searches the repository,
        finds evidence, ranks relevant files,
        and provides a grounded answer.
      </p>

      <div className="suggestion-grid">

        {SUGGESTED_QUESTIONS.map(
          (question) => (
            <button
              key={question}
              onClick={() =>
                askRepoPilot(question)
              }
            >
              <span>
                {question}
              </span>

              <ChevronRight
                size={14}
              />
            </button>
          )
        )}

      </div>

    </div>
  );
}

/* =========================================================
   CHAT MESSAGE
========================================================= */

function ChatMessage({
  message,
}) {
  if (message.type === "user") {
    return (
      <div className="user-message-row">

        <div className="user-bubble">
          {message.text}
        </div>

      </div>
    );
  }

  return (
    <div className="assistant-message-row">

      <div className="message-avatar">
        <Bot size={15} />
      </div>

      <div
        className={`assistant-bubble ${
          message.error
            ? "assistant-error"
            : ""
        }`}
      >

        <div className="answer-top">

          <strong>
            RepoPilot
          </strong>

          {message.bobUsed && (
            <span className="bob-badge">
              <Sparkles size={11} />
              IBM Bob
            </span>
          )}

        </div>

        <p className="answer-text">
          {message.text}
        </p>

        {message.confidence >
          0 && (
          <div className="confidence">

            <div className="confidence-label">
              <span>
                Confidence
              </span>

              <strong>
                {Math.round(
                  message.confidence *
                    100
                )}
                %
              </strong>
            </div>

            <div className="confidence-track">
              <div
                className="confidence-value"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      message.confidence *
                        100
                    )
                  )}%`,
                }}
              />
            </div>

          </div>
        )}

        {message.relevantFiles
          ?.length > 0 && (
          <EvidenceBlock
            icon={
              <FileCode2 size={14} />
            }
            title="Relevant files"
          >
            <div className="relevant-files">

              {message.relevantFiles.map(
                (file) => (
                  <div
                    key={file}
                    className="relevant-file"
                  >
                    <FileCode2
                      size={13}
                    />

                    <span>
                      {file}
                    </span>
                  </div>
                )
              )}

            </div>
          </EvidenceBlock>
        )}

        {message.evidence
          ?.length > 0 && (
          <EvidenceBlock
            icon={
              <Search size={14} />
            }
            title="Evidence"
          >
            <div className="evidence-list">

              {message.evidence.map(
                (line, index) => (
                  <div
                    className="evidence-row"
                    key={index}
                  >

                    <span>
                      {index + 1}
                    </span>

                    <code>
                      {line}
                    </code>

                  </div>
                )
              )}

            </div>
          </EvidenceBlock>
        )}

        {message.flow
          ?.length > 0 && (
          <EvidenceBlock
            icon={
              <GitBranch size={14} />
            }
            title="Flow"
          >
            <div className="answer-flow">

              {message.flow.map(
                (step, index) => (
                  <div
                    key={index}
                    className="answer-flow-step"
                  >
                    <span>
                      {index + 1}
                    </span>

                    <p>
                      {step}
                    </p>
                  </div>
                )
              )}

            </div>
          </EvidenceBlock>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   REUSABLE UI
========================================================= */

function PageHeader({
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="page-header">

      <div className="eyebrow">
        {eyebrow}
      </div>

      <h1>
        {title}
      </h1>

      <p>
        {description}
      </p>

    </div>
  );
}

function PanelHeader({
  title,
  description,
  action,
}) {
  return (
    <div className="panel-header">

      <div>
        <h2>
          {title}
        </h2>

        {description && (
          <p>
            {description}
          </p>
        )}
      </div>

      {action}

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      className="quick-card"
      onClick={onClick}
    >
      <div className="quick-icon">
        {icon}
      </div>

      <div className="quick-card-content">

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <ChevronRight
        size={17}
      />

    </button>
  );
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="info-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

function ArchitectureNode({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="architecture-node">

      <div className="architecture-node-icon">
        {icon}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>
      </div>

    </div>
  );
}

function ArrowConnector() {
  return (
    <div className="architecture-arrow">
      <ArrowRight size={19} />
    </div>
  );
}

function SetupStep({
  number,
  icon,
  title,
  description,
  children,
}) {
  return (
    <div className="setup-card">

      <div className="setup-number">
        {number}
      </div>

      <div className="setup-content">

        <div className="setup-icon">
          {icon}
        </div>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

        {children}

      </div>

    </div>
  );
}

function WorkflowStep({
  number,
  title,
  icon,
}) {
  return (
    <div className="workflow-step">

      <div className="workflow-number">
        {number}
      </div>

      <div className="workflow-icon">
        {icon}
      </div>

      <strong>
        {title}
      </strong>

    </div>
  );
}

function EvidenceBlock({
  icon,
  title,
  children,
}) {
  return (
    <div className="evidence-block">

      <div className="evidence-block-title">
        {icon}

        <strong>
          {title}
        </strong>
      </div>

      {children}

    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <div className="empty-state">

      <div className="empty-state-icon">
        {icon}
      </div>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>

    </div>
  );
}

function EmptyInline({
  text,
}) {
  return (
    <div className="empty-inline">
      <Info size={14} />
      {text}
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      milliseconds
    )
  );
}

function formatBytes(bytes = 0) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function getRepositoryNameFromUrl(
  url
) {
  if (!url) {
    return "";
  }

  try {
    const clean = url
      .replace(/\/+$/, "")
      .split("/");

    return clean[clean.length - 1]
      .replace(".git", "");
  } catch {
    return "";
  }
}

export default App;