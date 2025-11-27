/* eslint-disable @next/next/no-img-element */
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex font-sans">
      {/* Left Side - Image */}
      <div className="hidden lg:flex w-1/2 relative bg-black">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img
          src="/auth.jpg"
          alt="Kolehiyo ng Lungsod ng Dasmarinas"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-20 flex flex-col justify-between p-12 text-white h-full">
          <div className="flex items-center gap-3">
            <img
              src="/kld-logo.webp"
              alt="Logo"
              className="size-20 object-contain bg-white/10 rounded-full p-1 backdrop-blur-sm"
            />
            <span className="font-serif font-bold text-2xl tracking-wide">
              KLD Document Monitoring and Tracking System
            </span>
          </div>
          <div className="max-w-lg">
            <h2 className="font-serif text-4xl font-bold mb-4 leading-tight">
              Streamline Your Academic Workflow
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              The centralized document monitoring and tracking system designed
              for the modern campus. Efficient, transparent, and secure.
            </p>
          </div>
          <div className="text-sm text-white/50">
            © 2025 KLD Document Monitoring and Tracking System. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="text-center lg:text-left">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Please sign in to access your dashboard.
            </p>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
