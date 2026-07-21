import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#eefbf2] via-[#faf9f6] to-[#ffffff] text-gray-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(72,187,120,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_32%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <div className="space-y-8 rounded-[2rem] border border-white/70 bg-white/95 p-8 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] backdrop-blur-sm">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-700">
              Expectant AI
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-900">
              Your AI-powered pregnancy companion.
            </h1>
            <p className="mx-auto max-w-[22rem] text-base leading-7 text-gray-600">
              Your AI companion for every stage of pregnancy — capture daily updates, organize
              health records, and receive personalized guidance for both mom and baby.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-green-700 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-green-700">
              G
            </span>
            Continue with Google
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Home;
