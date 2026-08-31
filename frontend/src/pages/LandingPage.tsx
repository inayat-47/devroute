/**
 * src/pages/LandingPage.tsx
 *
 * Conversational input screen for DevRoute:
 * - Target role input (required)
 * - GitHub username input (optional)
 * - Collapsible resume / LinkedIn text area (optional fallback)
 * - Multi-stage loading feedback & distinct error state rendering
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGenerateGraph } from "../hooks/useGenerateGraph";

const ROLE_SUGGESTIONS = [
  "Senior Full-Stack Engineer",
  "iOS Engineer",
  "Cloud DevOps & Platform Engineer",
  "Backend Systems Engineer",
  "AI / Machine Learning Engineer",
];

export function LandingPage() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [showResume, setShowResume] = useState(false);

  const { generateAsync, isLoading, loadingStage, errorState, clearError } =
    useGenerateGraph();

  const isRoleValid = targetRole.trim().length > 0;
  const isInputProvided =
    githubUsername.trim().length > 0 || resumeText.trim().length > 0;
  const isSubmitDisabled = !isRoleValid || !isInputProvided || isLoading;

  const bothProvided =
    githubUsername.trim().length > 0 && resumeText.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    clearError();

    try {
      const result = await generateAsync({
        targetRole: targetRole.trim(),
        githubUsername: githubUsername.trim() || undefined,
        resumeText: resumeText.trim() || undefined,
      });

      // Navigate to /graph passing the combined result
      navigate("/graph", { state: result });
    } catch {
      // Errors are handled and displayed via errorState
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Background ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-brand-600/20 via-indigo-500/15 to-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 left-1/4 w-[500px] h-[350px] bg-gradient-to-br from-emerald-600/10 via-brand-500/10 to-transparent blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-black text-lg">
              D
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DevRoute
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            AI Profiling Engine v0.1
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-2xl">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-4 shadow-sm">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              GitHub-to-Skill-Gap Recommendation Engine
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Bridge the Gap to Your{" "}
              <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Dream Role
              </span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              No lengthy questionnaires. Enter your career goal, connect your
              GitHub profile, and get an interactive dependency graph with a personalized roadmap.
            </p>
          </div>

          {/* Error Banner: AI Provider Busy (429) */}
          {errorState?.type === "ai_rate_limit" && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-3 shadow-lg">
              <svg
                className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-amber-300 mb-0.5">
                  High Demand Notice
                </div>
                <div>{errorState.message}</div>
              </div>
              <button
                onClick={clearError}
                className="text-amber-400 hover:text-amber-200 transition-colors p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner: GitHub Rate Limit (429/403) */}
          {errorState?.type === "github_rate_limit" && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm flex items-start gap-3 shadow-lg">
              <svg
                className="w-5 h-5 text-blue-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-blue-300 mb-0.5">
                  GitHub Rate Limit Encountered
                </div>
                <div>{errorState.message}</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResume(true);
                    clearError();
                  }}
                  className="mt-2 text-xs font-semibold text-brand-300 underline hover:text-brand-200"
                >
                  Open Resume Input Box →
                </button>
              </div>
              <button
                onClick={clearError}
                className="text-blue-400 hover:text-blue-200 transition-colors p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner: General Error */}
          {errorState?.type === "general" && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
              <svg
                className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-rose-300 mb-0.5">
                  Analysis Failed
                </div>
                <div>{errorState.message}</div>
              </div>
              <button
                onClick={clearError}
                className="text-rose-400 hover:text-rose-200 transition-colors p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Card */}
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Role Input (Required) */}
              <div>
                <label
                  htmlFor="targetRole"
                  className="block text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between"
                >
                  <span>
                    Target Engineering Role{" "}
                    <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-xs text-slate-500 font-normal">
                    Required
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="targetRole"
                    type="text"
                    required
                    value={targetRole}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
                      if (errorState?.type === "general") clearError();
                    }}
                    placeholder="e.g. Senior Full-Stack Engineer, iOS Engineer..."
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm sm:text-base shadow-inner disabled:opacity-50"
                  />
                </div>

                {/* Quick Role Suggestions */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {ROLE_SUGGESTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setTargetRole(role)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        targetRole === role
                          ? "bg-brand-500/20 border-brand-500/50 text-brand-300"
                          : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* GitHub Username Input (Optional) */}
              <div>
                <label
                  htmlFor="githubUsername"
                  className="block text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between"
                >
                  <span>GitHub Username</span>
                  <span className="text-xs text-slate-500 font-normal">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono">
                    @
                  </div>
                  <input
                    id="githubUsername"
                    type="text"
                    value={githubUsername}
                    onChange={(e) => {
                      setGithubUsername(e.target.value);
                      if (errorState?.type === "github_not_found") clearError();
                    }}
                    placeholder="e.g. danramteke, octocat"
                    disabled={isLoading}
                    className={`w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950/70 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm sm:text-base shadow-inner disabled:opacity-50 ${
                      errorState?.type === "github_not_found"
                        ? "border-rose-500 focus:ring-rose-500/40 focus:border-rose-500"
                        : "border-slate-700/80 focus:ring-brand-500/50 focus:border-brand-500"
                    }`}
                  />
                </div>

                {/* Inline 404 Error for Username */}
                {errorState?.type === "github_not_found" && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 animate-fadeIn">
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {errorState.message}
                  </p>
                )}
              </div>

              {/* Both Provided Notice */}
              {bothProvided && (
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  Both fields filled: GitHub profile will be prioritized for automated repository analysis.
                </div>
              )}

              {/* Collapsible Resume / LinkedIn Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowResume(!showResume)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors focus:outline-none"
                >
                  <span
                    className={`transform transition-transform text-slate-500 ${
                      showResume ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ▶
                  </span>
                  {showResume
                    ? "Hide resume / LinkedIn text input"
                    : "Or paste your resume / LinkedIn text instead"}
                </button>

                {showResume && (
                  <div className="mt-3 animate-fadeIn">
                    <textarea
                      rows={4}
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      disabled={isLoading}
                      placeholder="Paste your resume summary, skills list, or LinkedIn experience here (e.g. '3 years experience with Swift, UIKit, CoreData, REST APIs, Git...')"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none shadow-inner disabled:opacity-50"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Useful if your profile is private or you have experience outside GitHub.
                    </p>
                  </div>
                )}
              </div>

              {/* Multi-Stage Loading Feedback */}
              {isLoading && (
                <div className="p-4 rounded-xl bg-brand-950/40 border border-brand-800/60 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-300">
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-brand-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {loadingStage === "analyzing"
                        ? githubUsername.trim()
                          ? `Analyzing @${githubUsername.trim()}'s repositories & dependencies...`
                          : "Extracting skills from provided experience..."
                        : "Generating interactive learning path with AI..."}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {loadingStage === "analyzing" ? "Step 1/2" : "Step 2/2"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-700 ${
                        loadingStage === "analyzing" ? "w-1/2" : "w-11/12 animate-pulse"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-xl ${
                  isSubmitDisabled
                    ? "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-brand-600/30 hover:shadow-brand-500/50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <span>Generating Career Path...</span>
                ) : (
                  <>
                    <span>Generate Learning Path</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 text-center py-4 text-xs text-slate-600">
        DevRoute — AI-Powered Skill-Gap Engine • React + FastAPI + Groq
      </footer>
    </div>
  );
}
