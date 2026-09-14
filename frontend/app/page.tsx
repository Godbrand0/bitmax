import { Landing } from "@/components/Landing";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 py-10 sm:px-6">
        <Landing />
      </div>
    </div>
  );
}
