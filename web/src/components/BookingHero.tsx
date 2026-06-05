import type { PageConfig } from '@/types';

interface Props {
  config: PageConfig;
}

export default function BookingHero({ config }: Props): React.ReactElement {
  const bgStyle = config.bg_image_url
    ? { backgroundImage: `url(${config.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <header
      className="relative min-h-64 flex items-center justify-center text-center px-6 py-16 bg-gradient-to-br from-indigo-600 to-purple-700"
      style={bgStyle}
    >
      {config.bg_image_url && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{config.title}</h1>
        <p className="text-xl text-white/80">{config.description}</p>
      </div>
    </header>
  );
}
