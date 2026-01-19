/**
 * BookingForm.js
 * Formulaire de réservation client
 * Composant extrait de App.js
 * 
 * NOTE: Ce composant reçoit toutes les données via props pour préserver
 * la logique métier centralisée dans App.js (calcul prix, validation, etc.)
 */

export const BookingForm = ({
  // Translations
  t,
  // Selected items
  selectedOffer,
  selectedCourse,
  selectedDates,
  // User data
  userName,
  userEmail,
  userWhatsapp,
  shippingAddress,
  discountCode,
  // State setters (passés depuis App.js)
  setUserName,
  setUserEmail,
  setUserWhatsapp,
  setShippingAddress,
  setDiscountCode,
  // Variants
  selectedVariants,
  setSelectedVariants,
  // Terms
  hasAcceptedTerms,
  setHasAcceptedTerms,
  // Price & Discount
  totalPrice,
  appliedDiscount,
  // Messages
  promoMessage,
  validationMessage,
  // Loading
  loading,
  // Quantity (for products)
  quantity,
  setQuantity,
  // Audio feature
  audioFeatureEnabled,
  onOpenAudioPlayer,
  // Terms modal
  onShowTermsModal,
  // Form submission
  onSubmit,
  // Email change handler (for existing client lookup)
  onEmailChange
}) => {
  
  if (!selectedOffer) return null;

  const isPhysicalProduct = selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct;

  return (
    <form onSubmit={onSubmit}>
      <div id="user-info-section" className="form-section rounded-xl p-6 mb-6" data-testid="user-info-section">
        <h2 className="font-semibold mb-4 text-white" style={{ fontSize: '18px' }}>{t('yourInfo')}</h2>
        <div className="space-y-4">
          {/* Private input fields with auto-fill support */}
          <input 
            type="text" 
            required 
            placeholder={t('fullName')} 
            value={userName} 
            onChange={e => setUserName(e.target.value)} 
            className="w-full p-3 rounded-lg neon-input" 
            data-testid="user-name-input" 
            autoComplete="name" 
          />
          <input 
            type="email" 
            required 
            placeholder={t('emailRequired')} 
            value={userEmail} 
            onChange={e => onEmailChange(e.target.value)} 
            className="w-full p-3 rounded-lg neon-input" 
            data-testid="user-email-input" 
            autoComplete="email" 
          />
          <input 
            type="tel" 
            required 
            placeholder={t('whatsappRequired')} 
            value={userWhatsapp} 
            onChange={e => setUserWhatsapp(e.target.value)} 
            className="w-full p-3 rounded-lg neon-input" 
            data-testid="user-whatsapp-input" 
            autoComplete="tel" 
          />
          
          {/* Champ Adresse - Affiché uniquement pour les produits physiques */}
          {isPhysicalProduct && (
            <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-900/20">
              <p className="text-xs text-purple-400 mb-2">📦 Produit physique - Adresse de livraison requise</p>
              <input 
                type="text" 
                required 
                placeholder="Adresse complète (rue, numéro, code postal, ville)" 
                value={shippingAddress} 
                onChange={e => setShippingAddress(e.target.value)} 
                className="w-full p-3 rounded-lg neon-input" 
                data-testid="shipping-address-input" 
                autoComplete="street-address" 
              />
            </div>
          )}
          
          {/* Sélecteur de variantes interactif */}
          {selectedOffer?.variants && Object.keys(selectedOffer.variants).length > 0 && (
            <div className="border border-pink-500/30 rounded-lg p-4 bg-pink-900/10" data-testid="variants-selector">
              <p className="text-xs text-pink-400 mb-3 font-medium">🎨 Sélectionnez vos options</p>
              
              {/* Tailles */}
              {selectedOffer.variants.sizes && selectedOffer.variants.sizes.length > 0 && (
                <div className="mb-4">
                  <p className="variant-label">Taille</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.variants.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedVariants(prev => ({ ...prev, size }))}
                        className={`variant-chip ${selectedVariants.size === size ? 'selected' : ''}`}
                        data-testid={`variant-size-${size}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {!selectedVariants.size && (
                    <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner une taille</p>
                  )}
                </div>
              )}
              
              {/* Couleurs */}
              {selectedOffer.variants.colors && selectedOffer.variants.colors.length > 0 && (
                <div className="mb-4">
                  <p className="variant-label">Couleur</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.variants.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedVariants(prev => ({ ...prev, color }))}
                        className={`variant-chip ${selectedVariants.color === color ? 'selected' : ''}`}
                        data-testid={`variant-color-${color}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                  {!selectedVariants.color && (
                    <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner une couleur</p>
                  )}
                </div>
              )}
              
              {/* Poids */}
              {selectedOffer.variants.weights && selectedOffer.variants.weights.length > 0 && (
                <div className="mb-2">
                  <p className="variant-label">Poids</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.variants.weights.map((weight) => (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => setSelectedVariants(prev => ({ ...prev, weight }))}
                        className={`variant-chip ${selectedVariants.weight === weight ? 'selected' : ''}`}
                        data-testid={`variant-weight-${weight}`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                  {!selectedVariants.weight && (
                    <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner un poids</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Promo code input */}
          <div>
            <input 
              type="text" 
              placeholder={t('promoCode')} 
              value={discountCode} 
              onChange={e => setDiscountCode(e.target.value)}
              className={`w-full p-3 rounded-lg ${appliedDiscount ? 'valid-code' : 'neon-input'}`} 
              data-testid="discount-code-input" 
              autoComplete="off" 
            />
            
            {/* FEEDBACK VISUEL: Message clair sous le champ code promo */}
            {promoMessage.text && (
              <p 
                className={`mt-2 text-sm font-medium ${
                  promoMessage.type === 'success' ? 'text-green-400' : 
                  promoMessage.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                }`} 
                data-testid="promo-message"
              >
                {promoMessage.text}
              </p>
            )}
          </div>
          
          {/* Other validation messages */}
          {validationMessage && (
            <p className="text-red-400 text-sm font-medium" data-testid="validation-message">
              {validationMessage}
            </p>
          )}
          
          {/* Price summary with quantity selector and discount */}
          <div className="p-4 rounded-lg card-gradient">
            <>
              <div className="flex justify-between items-center text-white text-sm mb-2">
                <span>{selectedOffer.name}</span>
                <span>CHF {selectedOffer.price.toFixed(2)}</span>
              </div>
              
              {/* Pour les services/cours: Afficher les dates sélectionnées */}
              {!isPhysicalProduct && selectedDates.length > 0 && (
                <div className="mb-3 p-3 rounded-lg" style={{ 
                  background: 'rgba(217, 28, 210, 0.1)', 
                  border: '1px solid rgba(217, 28, 210, 0.3)' 
                }}>
                  <p className="text-xs text-pink-400 mb-2 font-medium">📅 Dates sélectionnées ({selectedDates.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((dateISO, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 rounded-full text-xs text-white"
                        style={{ 
                          background: 'rgba(217, 28, 210, 0.3)',
                          border: '1px solid #D91CD2'
                        }}
                      >
                        {new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    ))}
                  </div>
                  {selectedDates.length > 1 && (
                    <p className="text-xs text-white opacity-70 mt-2">
                      💡 Cliquez sur les dates ci-dessus pour en ajouter ou retirer
                    </p>
                  )}
                </div>
              )}
              
              {/* Quantity selector - Visible uniquement pour les produits physiques */}
              {isPhysicalProduct && (
                <div className="flex justify-between items-center text-white text-sm mb-2">
                  <span>{t('quantity') || 'Quantité'}:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      data-testid="quantity-minus"
                    >-</button>
                    <span className="w-8 text-center font-bold" data-testid="quantity-value">{quantity}</span>
                    <button 
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      data-testid="quantity-plus"
                    >+</button>
                  </div>
                </div>
              )}
              
              {/* Sous-total pour produits physiques */}
              {isPhysicalProduct && quantity > 1 && (
                <div className="flex justify-between text-white text-xs opacity-60 mb-1">
                  <span>Sous-total ({quantity} x CHF {selectedOffer.price.toFixed(2)})</span>
                  <span>CHF {(selectedOffer.price * quantity).toFixed(2)}</span>
                </div>
              )}
              
              {/* Sous-total pour services/cours avec multi-dates */}
              {!isPhysicalProduct && selectedDates.length > 1 && (
                <div className="flex justify-between text-white text-xs opacity-60 mb-1">
                  <span>Sous-total ({selectedDates.length} dates x CHF {selectedOffer.price.toFixed(2)})</span>
                  <span>CHF {(selectedOffer.price * selectedDates.length).toFixed(2)}</span>
                </div>
              )}
              
              {appliedDiscount && (
                <div className="flex justify-between text-green-400 text-sm mb-1">
                  <span>Réduction ({appliedDiscount.code})</span>
                  <span>
                    {appliedDiscount.type === '100%' ? '-100%' : 
                     appliedDiscount.type === '%' ? `-${appliedDiscount.value}%` : 
                     `-${appliedDiscount.value} CHF`}
                  </span>
                </div>
              )}
              <hr className="border-gray-600 my-2" />
            </>
            <p className="font-bold text-white text-lg flex justify-between" data-testid="total-price">
              <span>{t('total')}:</span>
              <span style={{ color: parseFloat(totalPrice) === 0 ? '#4ade80' : '#d91cd2' }}>
                CHF {totalPrice}
                {parseFloat(totalPrice) === 0 && <span className="ml-2 text-sm">(GRATUIT)</span>}
              </span>
            </p>
          </div>
          
          {/* CGV checkbox with clickable link */}
          <label className="flex items-start gap-2 cursor-pointer text-xs text-white opacity-70">
            <input 
              type="checkbox" 
              required 
              checked={hasAcceptedTerms} 
              onChange={e => setHasAcceptedTerms(e.target.checked)} 
              data-testid="terms-checkbox" 
            />
            <span>
              {t('acceptTerms')}{' '}
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); onShowTermsModal(); }}
                className="underline hover:text-purple-400"
                style={{ color: '#d91cd2' }}
                data-testid="terms-link"
              >
                {t('termsLink') || 'conditions générales'}
              </button>
              {' '}et confirme ma réservation.
            </span>
          </label>
        </div>
      </div>
      
      {/* BOUTON EXPERIENCE AUDIO IMMERSIVE */}
      {selectedCourse && 
       selectedCourse.playlist && 
       selectedCourse.playlist.length > 0 && 
       audioFeatureEnabled && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onOpenAudioPlayer}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #d91cd2)',
              boxShadow: '0 4px 20px rgba(217, 28, 210, 0.4)'
            }}
            data-testid="join-audio-experience-btn"
          >
            <span style={{ fontSize: '24px' }}>🎧</span>
            <span>Rejoindre l'expérience immersive</span>
          </button>
          <p className="text-center text-white/40 text-xs mt-2">
            Ambiance musicale pendant votre session
          </p>
        </div>
      )}

      {/* DYNAMISME DU BOUTON: Change selon le montant total */}
      <button 
        type="submit" 
        disabled={!hasAcceptedTerms || loading} 
        className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide ${parseFloat(totalPrice) === 0 ? 'btn-free' : 'btn-primary'}`} 
        data-testid="submit-reservation-btn"
      >
        {loading ? t('loading') : parseFloat(totalPrice) === 0 ? '🎁 Réserver gratuitement' : t('payAndReserve')}
      </button>
    </form>
  );
};

export default BookingForm;
