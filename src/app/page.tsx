
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Users, Building2, Receipt, Activity } from "lucide-react";
import { Logo } from "@/components/logo";


function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex h-14 max-w-screen-2xl mx-auto items-center justify-between">
        <Logo />
        <div className="flex items-center space-x-2">
           <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
                <Link href="#features">Features</Link>
            </Button>
             <Button variant="ghost">Pricing</Button>
             <Button asChild>
                <Link href="/login">Login</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
    return (
        <footer className="py-6 md:px-8 md:py-0 border-t bg-white">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto">
                <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
                    Built by your friendly AI assistant.
                </p>
                 <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} KlaroGov.ph. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
}

const LandingPage = () => {
    const heroImage = PlaceHolderImages.find(p => p.id === 'onboarding-hero');
  return (
    <div className="bg-slate-50 font-sans text-slate-900">
      <Header />
      <main>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 bg-white">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-6">
            🚀 Now with AI-Powered Analytics
          </span>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 lg:text-7xl mb-6">
            The All-In-One Operating System for the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Modern Barangay
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10">
            From real-time emergency response to COA-compliant financial reports—streamline your entire local government operation in one secure cloud platform.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button size="lg">
              Book a Demo
            </Button>
            <Button variant="outline" size="lg" asChild>
                <Link href="/login?tour=true">
                    View Interactive Tour
                </Link>
            </Button>
          </div>

          {/* DYNAMIC HERO IMAGE */}
          <div className="relative mt-16 mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30"></div>
            <div className="relative aspect-video rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <Image 
                src={heroImage?.imageUrl || "https://picsum.photos/seed/dashboard/1200/800"}
                alt={heroImage?.description || "KlaroGov Dashboard Interface"}
                fill
                className="object-cover"
              />
              <div className="absolute top-10 right-10 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-blue-100 animate-bounce">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">AI Insight</p>
                    <p className="text-sm font-medium">Kapitan, you have 3 pending hearings.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SOCIAL PROOF */}
       <section className="py-12 bg-white">
        <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                Trusted by forward-thinking leaders in local governance
            </p>
            {/* Logos would go here */}
        </div>
      </section>

      {/* 3. CORE MODULES */}
      <section className="py-24 bg-white" id="features">
        <div className="container mx-auto px-4">
            <div className="text-center mb-16">
                 <h2 className="text-4xl font-bold text-slate-900">An OS for Your Entire Barangay</h2>
                 <p className="text-slate-500 mt-4 max-w-2xl mx-auto">From public safety to financial management, KlaroGov provides dedicated modules for every aspect of your operation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {[
                    { icon: <Users/>, title: 'Registry', description: 'Manage residents, households, and pets.', href: '/dashboard/residents' },
                    { icon: <Building2/>, title: 'Operations', description: 'Handle documents, blotter cases, and announcements.', href: '/dashboard/documents' },
                    { icon: <Receipt/>, title: 'Administration', description: 'Track financials, disbursements, and projects.', href: '/dashboard/financials' },
                    { icon: <Activity/>, title: 'Command Center', description: 'Monitor emergencies and gain AI-powered insights.', href: '/dashboard/emergency' },
                ].map((item) => (
                    <Link href={item.href} key={item.title} className="block h-full">
                        <div className="group rounded-2xl border border-slate-200 bg-white p-6 h-full flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                           <div className="mb-4 h-12 w-12 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                                {item.icon}
                           </div>
                           <h3 className="text-lg font-bold">{item.title}</h3>
                           <p className="text-sm text-slate-500 mt-2 flex-grow">{item.description}</p>
                           <div className="mt-4 text-sm font-semibold text-blue-600 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               Go to module <ArrowRight className="h-4 w-4" />
                           </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
      </section>
      
      {/* 4. The "AI Advantage" */}
      <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                 <h2 className="text-4xl font-bold text-slate-900">Your Virtual Barangay Secretary</h2>
                 <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Use Klaro AI to draft resolutions, analyze community crime trends, and summarize resident concerns instantly.</p>
              </div>
               <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">🤖</span>
                                <input type="text" placeholder="Draft a speech for the upcoming Fiesta..." className="w-full bg-slate-100 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                <Button>Generate</Button>
                            </div>
                        </CardContent>
                    </Card>
               </div>
          </div>
      </section>

       {/* 5. CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 mx-auto">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Modernize Your Barangay?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join the growing number of barangays embracing digital transformation. Get started with KlaroGov today.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
               <Button size="lg" asChild>
                    <Link href="/login">Request a Demo</Link>
               </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
