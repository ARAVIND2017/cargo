import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ContainerManagement from "@/pages/ContainerManagement";
import ItemTracking from "@/pages/ItemTracking";
import WasteManagement from "@/pages/WasteManagement";
import Simulation from "@/pages/Simulation";
import Reports from "@/pages/Reports";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NavigationTabs from "@/components/layout/NavigationTabs";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NavigationTabs />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/containers" component={ContainerManagement} />
          <Route path="/items" component={ItemTracking} />
          <Route path="/waste" component={WasteManagement} />
          <Route path="/simulation" component={Simulation} />
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;
