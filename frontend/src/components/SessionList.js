/**
 * SessionList.js
 * Liste des cours/sessions avec icône audio 🎧
 * Composant extrait de App.js
 */

// Location Icon SVG
const LocationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/**
 * Génère les N prochaines occurrences d'un jour de la semaine
 * @param {number} weekday - Jour de la semaine (0=dimanche, 1=lundi, ..., 6=samedi)
 * @param {number} count - Nombre d'occurrences à générer
 */
function getNextOccurrences(weekday, count = 4) {
  const occurrences = [];
  const today = new Date();
  let day = today.getDay();
  let diff = weekday - day;
  if (diff < 0) diff += 7;
  
  const firstOccurrence = new Date(today);
  firstOccurrence.setDate(today.getDate() + diff);
  
  for (let i = 0; i < count; i++) {
    const occurrence = new Date(firstOccurrence);
    occurrence.setDate(firstOccurrence.getDate() + i * 7);
    occurrences.push(occurrence);
  }
  return occurrences;
}

/**
 * Formate une date selon la langue
 */
function formatDate(date, time, lang) {
  const options = { weekday: "short", day: "2-digit", month: "2-digit" };
  const formatted = date.toLocaleDateString(lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'fr-FR', options);
  return `${formatted} • ${time}`;
}

export const SessionList = ({
  courses,
  selectedCourse,
  selectedDates,
  audioFeatureEnabled,
  lang,
  t,
  onSelectCourse,
  onToggleDateSelection,
  onOpenAudioPlayer
}) => {
  
  const renderDates = (course) => {
    const dates = getNextOccurrences(course.weekday);
    const hasPlaylist = course.playlist && course.playlist.length > 0 && audioFeatureEnabled;
    
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {dates.map((date, idx) => {
          const dateISO = date.toISOString();
          const isSelected = selectedCourse?.id === course.id && selectedDates.includes(dateISO);
          return (
            <button 
              key={idx} 
              type="button"
              onClick={() => { 
                // Sélectionner le cours si différent
                if (selectedCourse?.id !== course.id) {
                  onSelectCourse(course, dateISO);
                } else {
                  // Toggle la date (ajouter/retirer)
                  onToggleDateSelection(dateISO);
                }
              }}
              className={`session-btn px-3 py-2 rounded-lg text-sm font-medium ${isSelected ? 'selected' : ''}`}
              style={{ color: 'white', position: 'relative' }} 
              data-testid={`date-btn-${course.id}-${idx}`}
            >
              <span className="flex items-center justify-center gap-2">
                {formatDate(date, course.time, lang)} {isSelected && '✔'}
                {/* Icône Audio si playlist disponible */}
                {hasPlaylist && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation(); // Ne pas interférer avec la sélection de date
                      // Sélectionner ce cours si pas déjà sélectionné
                      if (selectedCourse?.id !== course.id) {
                        onSelectCourse(course, dateISO);
                      }
                      // Ouvrir le lecteur audio
                      onOpenAudioPlayer();
                    }}
                    className="audio-icon-session"
                    style={{
                      color: '#d91cd2',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginLeft: '4px',
                      transition: 'transform 0.2s, filter 0.2s'
                    }}
                    title="Écouter l'ambiance audio"
                    data-testid={`audio-icon-${course.id}-${idx}`}
                  >
                    🎧
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <div id="sessions-section" className="mb-8">
      <h2 className="font-semibold mb-4 text-white" style={{ fontSize: '18px' }}>
        {t('chooseSession')}
      </h2>
      <div 
        className="space-y-4" 
        style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          paddingRight: '8px'
        }}
      >
        {courses.map(course => (
          <div 
            key={course.id} 
            className={`course-card rounded-xl p-4 ${selectedCourse?.id === course.id ? 'selected' : ''}`}
            data-testid={`course-card-${course.id}`}
          >
            <h3 className="font-semibold text-white mb-1" style={{ fontSize: '16px' }}>
              {course.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-white opacity-60 mb-1">
              <LocationIcon />
              <span>{course.locationName}</span>
              {course.mapsUrl && (
                <a 
                  href={course.mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 flex items-center gap-1" 
                  style={{ color: '#8b5cf6' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LocationIcon /> Maps
                </a>
              )}
            </div>
            {renderDates(course)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionList;
