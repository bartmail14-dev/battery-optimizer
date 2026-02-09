import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Battery, Zap, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalculation, useProjects } from './hooks';
import { AdvisorChat } from './components/ai-advisor';
import { ProjectSelector, SaveProjectDialog } from './components/projects';
import { InputPage } from './pages/InputPage';
import { ResultsPage } from './pages/ResultsPage';
import { ReportPage } from './pages/ReportPage';
import { ComparisonPage } from './pages/ComparisonPage';

const STEPS = [
  { path: '/', label: 'Invoer', step: 1 },
  { path: '/results', label: 'Resultaten', step: 2 },
  { path: '/report', label: 'Rapport', step: 3 },
  { path: '/vergelijking', label: 'Vergelijking', step: 4 },
];

function StepIndicator() {
  const location = useLocation();
  const currentStep = STEPS.find((s) => s.path === location.pathname)?.step ?? 1;

  return (
    <nav className="flex items-center justify-center gap-2 py-3" aria-label="Stappen">
      {STEPS.map((step, i) => (
        <div key={step.path} className="flex items-center">
          <div
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
              currentStep >= step.step
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-400'
            )}
          >
            <span
              className={clsx(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                currentStep >= step.step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-white'
              )}
            >
              {step.step}
            </span>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={clsx(
                'mx-1 h-px w-8',
                currentStep > step.step ? 'bg-blue-400' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </nav>
  );
}

function AppContent() {
  const calc = useCalculation();
  const projectsHook = useProjects();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  async function handleSelectProject(id: string) {
    const project = await projectsHook.loadProject(id);
    if (project) {
      calc.loadFromProject(project);
      navigate('/');
    }
  }

  async function handleSaveProject(name: string, description: string) {
    await projectsHook.saveProject(name, description, {
      name,
      description,
      sector: calc.sector,
      batteryConfig: calc.batteryConfig,
      annualConsumptionKwh: calc.annualConsumption,
      peakDemandKw: calc.peakDemand,
      connectionCapacityKw: calc.connectionCapacity,
      dataSource: calc.customHourlyProfile ? 'csv' : 'synthetic',
      tariffConfig: calc.tariffs,
      subsidyConfig: calc.subsidies,
      financialParams: calc.financials,
      hourlyConsumptionKwh: calc.customHourlyProfile ?? undefined,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Battery className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">COMCAM</span>
              <span className="ml-2 text-sm text-gray-500">Battery Optimizer</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSaveDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              title="Project opslaan"
            >
              <Save className="h-4 w-4 text-gray-400" />
              Opslaan
            </button>
            <ProjectSelector
              projects={projectsHook.projects}
              currentProjectId={projectsHook.currentProjectId}
              isLoading={projectsHook.isLoading}
              onLoadProjects={projectsHook.loadProjects}
              onSelectProject={handleSelectProject}
              onDeleteProject={projectsHook.deleteProject}
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Zap className="h-3 w-3" />
              Powered by COMCAM
            </div>
          </div>
        </div>
        <StepIndicator />
      </header>

      {/* Main content */}
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <InputPage
                batteryConfig={calc.batteryConfig}
                sector={calc.sector}
                annualConsumption={calc.annualConsumption}
                peakDemand={calc.peakDemand}
                connectionCapacity={calc.connectionCapacity}
                isCalculating={calc.isCalculating}
                hasCustomProfile={calc.customHourlyProfile !== null}
                customHourlyProfile={calc.customHourlyProfile}
                setBatteryConfig={calc.setBatteryConfig}
                setSector={calc.setSector}
                setAnnualConsumption={calc.setAnnualConsumption}
                setPeakDemand={calc.setPeakDemand}
                setConnectionCapacity={calc.setConnectionCapacity}
                setCustomHourlyProfile={calc.setCustomHourlyProfile}
                calculate={calc.calculate}
              />
            }
          />
          <Route
            path="/results"
            element={
              <ResultsPage
                results={calc.results}
                sensitivity={calc.sensitivity}
                batteryConfig={calc.batteryConfig}
                energyProfile={calc.energyProfile}
                financials={calc.financials}
                dashboardState={calc.dashboardState}
                isCalculating={calc.isCalculating}
                error={calc.error}
              />
            }
          />
          <Route
            path="/report"
            element={
              <ReportPage
                results={calc.results}
                batteryConfig={calc.batteryConfig}
                energyProfile={calc.energyProfile}
                financials={calc.financials}
                dashboardState={calc.dashboardState}
                sensitivity={calc.sensitivity}
              />
            }
          />
          <Route
            path="/vergelijking"
            element={
              <ComparisonPage
                batteryConfig={calc.batteryConfig}
                energyProfile={calc.energyProfile}
                tariffs={calc.tariffs}
                subsidies={calc.subsidies}
                financials={calc.financials}
              />
            }
          />
        </Routes>
      </main>

      {/* AI Advisor Chat */}
      <AdvisorChat
        dashboardState={calc.dashboardState}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />

      {/* Save Project Dialog */}
      <SaveProjectDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveProject}
        isLoading={projectsHook.isLoading}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
