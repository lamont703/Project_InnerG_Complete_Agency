import RequestsClient from "./RequestsClient";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Shop Day Requests | Inner G Complete Agency",
  description: "Securely view and manage Shop Day requests from local barbers.",
};

export default function ShopDayRequestsPage() {
  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 flex flex-col">
      <Navbar />
      
      <section className="relative overflow-hidden flex-grow flex flex-col border-b border-slate-200">
        {/* Hero Background Video */}
        <div className="absolute inset-0 z-0 bg-slate-50 overflow-hidden pointer-events-none">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-75"
          >
            <source src="/network-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-slate-50" />
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
        
        <div className="relative z-10 container mx-auto px-4 py-32 max-w-5xl flex-grow flex flex-col justify-center">
          <div className="text-center mb-12">
            <h1 className="flex justify-center mb-6">
              <img 
                src="/shopday-logo.svg" 
                alt="ShopDay™ Requests" 
                className="h-20 md:h-28 w-auto drop-shadow-sm"
                draggable="false"
              />
            </h1>
            <p className="text-slate-600 font-medium text-lg max-w-2xl mx-auto">
              Manage your barbershop's talent pipeline. Enter your shop's phone number below to securely review barbers who have requested a Shop Day with you.
            </p>
          </div>

          <RequestsClient />
        </div>
      </section>

      <Footer />
    </main>
  );
}
