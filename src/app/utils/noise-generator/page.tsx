import GenerateNoise from "../generateNoise";

export default function NoiseGeneratorPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Noise Texture Generator</h1>
        <p className="mb-4 text-gray-600 text-center">
          This utility generates a noise texture that you can download and use in your project.
          <br />
          After downloading, place the noise.png file in the public directory.
        </p>
        <GenerateNoise />
      </div>
    </div>
  );
} 