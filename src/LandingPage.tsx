
import CampusMap from './CampusMap';
import './LandingPage.css';

type LandingPageProps = {
  onSignIn: () => void;
  onCreateAccount: () => void;
};

const campusPhotos = [
  {
    src: '/campus/pnc-landmark.jpg',
    alt: 'I Love PNC landmark at the University of Cabuyao',
  },
  {
    src: '/campus/campus-building.jpg',
    alt: 'University of Cabuyao campus building',
  },
  {
    src: '/campus/campus-life.jpg',
    alt: 'Students walking around the campus',
  },
  {
    src: '/campus/computer-lab.webp',
    alt: 'Students inside the computer laboratory',
  },
];

export default function LandingPage({
  onSignIn,
  onCreateAccount,
}: LandingPageProps) {
  return (
    <main className="findit-landing" id="home">
      <div className="findit-landing-inner">
        <section
          className="findit-snapshots"
          aria-label="Campus snapshots"
        >
          <div className="findit-photo-layout">
            {/* Interactive campus map */}
            <div className="findit-photo-large findit-map-tile">
              <CampusMap />
            </div>

            {/* Actual campus photos */}
            <div className="findit-photo-stack">
              {campusPhotos.map((photo, index) => (
                <div
                  className={`findit-photo-small findit-photo-${index + 1}`}
                  key={photo.src}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="findit-campus-photo"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            <div
              className="findit-photo-accent"
              aria-hidden="true"
            />
          </div>

          <div className="findit-snapshots-caption">
            <p className="findit-eyebrow">
              SNAPSHOTS FROM CAMPUS
            </p>
            <p>
              Familiar places, shared spaces, and everyday
              campus moments. FindIt brings lost and found
              reports together in one easy-to-search place.
            </p>
          </div>
        </section>

        <section
          className="findit-landing-intro"
          aria-label="Welcome to FindIt"
        >
          <div
            className="findit-preview"
            aria-label="Preview of the FindIt lost and found board"
          >
            <div className="findit-preview-header">
              <span className="findit-preview-kicker">
                WELCOME TO FINDIT
              </span>
              <strong>
                Find it. Report it. Reunite it.
              </strong>
              <span>
                Campus lost and found, made simple.
              </span>
            </div>

            <div className="findit-preview-filters">
              <span>All categories ▾</span>
              <span>All locations ▾</span>
              <span>All items ▾</span>
            </div>

            <div className="findit-preview-grid">
              <article className="findit-preview-item">
                <div className="findit-preview-image">
                  🎒
                </div>
                <span className="findit-preview-tag lost">
                  Lost
                </span>
                <strong>Black Backpack</strong>
                <small>Library</small>
              </article>

              <article className="findit-preview-item">
                <div className="findit-preview-image">
                  🪪
                </div>
                <span className="findit-preview-tag found">
                  Found
                </span>
                <strong>Student ID</strong>
                <small>Cafeteria</small>
              </article>

              <article className="findit-preview-item">
                <div className="findit-preview-image">
                  🎧
                </div>
                <span className="findit-preview-tag lost">
                  Lost
                </span>
                <strong>Wireless Earbuds</strong>
                <small>Computer Laboratory</small>
              </article>
            </div>
          </div>

          <div className="findit-landing-copy">
            <p className="findit-eyebrow">
              WELCOME TO FINDIT LOST &amp; FOUND
            </p>

            <h1>
              Find it. Report it.
              <br />
              Reunite it.
            </h1>

            <p className="findit-description">
              A simple way for students to report lost items,
              browse found belongings, and reconnect them
              with their rightful owners.
            </p>

            <div className="findit-landing-actions">
              <button
                className="findit-landing-primary"
                type="button"
                onClick={onSignIn}
              >
                Sign In
              </button>

              <button
                className="findit-landing-secondary"
                type="button"
                onClick={onCreateAccount}
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
