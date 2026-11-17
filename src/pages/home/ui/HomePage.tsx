import { HomeLogo } from './HomeLogo';

type Headline = {
  emphasis: string;
  rest: string;
};

type HomePageProps = {
  hero: {
    title1: Headline;
    title2: Headline;
  };
};

export function HomePage({ hero }: HomePageProps) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[440px] place-items-center pt-[calc(36px+env(safe-area-inset-top,0px))] pb-[calc(40px+env(safe-area-inset-bottom,0px))]">
      <section
        className="flex flex-col items-center gap-3 text-center motion-safe:animate-rise"
        aria-labelledby="hero-headline"
      >
        <HomeLogo />
        <h1
          className="mt-4 text-balance text-[clamp(15px,4.4vw,18px)] leading-[1.9] font-medium tracking-[0.2em] uppercase select-none [&_em]:underline [&_em]:decoration-[0.09em] [&_em]:underline-offset-[0.22em] [&_em]:not-italic"
          id="hero-headline"
        >
          <span className="block">
            <em>{hero.title1.emphasis}</em> {hero.title1.rest}
          </span>
          <span className="block text-muted">
            <em>{hero.title2.emphasis}</em> {hero.title2.rest}
          </span>
        </h1>
      </section>
    </main>
  );
}
