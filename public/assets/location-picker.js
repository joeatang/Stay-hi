/**
 * Tesla-Grade Location Picker
 * Simple country + state/region selector with minimal UI
 */

window.LocationPicker = {
  // Tesla-Grade Global Coverage - All Continents and Major Countries
  countries: {
    // NORTH AMERICA
    'United States': {
      code: 'US',
      states: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
    },
    'Canada': {
      code: 'CA',
      states: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon']
    },
    'Mexico': { 
      code: 'MX', 
      states: ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'] 
    },

    // EUROPE
    'United Kingdom': {
      code: 'GB',
      states: ['England', 'Scotland', 'Wales', 'Northern Ireland']
    },
    'Germany': { 
      code: 'DE', 
      states: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'] 
    },
    'France': { 
      code: 'FR', 
      states: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitania', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'] 
    },
    'Italy': { 
      code: 'IT', 
      states: ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Puglia', 'Sardinia', 'Sicily', 'Tuscany', 'Trentino-Alto Adige', 'Umbria', 'Veneto'] 
    },
    'Spain': { 
      code: 'ES', 
      states: ['Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencia'] 
    },
    'Netherlands': { code: 'NL', states: [] },
    'Sweden': { code: 'SE', states: [] },
    'Norway': { code: 'NO', states: [] },
    'Denmark': { code: 'DK', states: [] },
    'Finland': { code: 'FI', states: [] },
    'Poland': { code: 'PL', states: [] },
    'Switzerland': { code: 'CH', states: [] },
    'Austria': { code: 'AT', states: [] },
    'Belgium': { code: 'BE', states: [] },
    'Portugal': { code: 'PT', states: [] },
    'Ireland': { code: 'IE', states: [] },
    'Czech Republic': { code: 'CZ', states: [] },
    'Hungary': { code: 'HU', states: [] },
    'Greece': { code: 'GR', states: [] },
    'Romania': { code: 'RO', states: [] },
    'Croatia': { code: 'HR', states: [] },

    // ASIA
    'Japan': { code: 'JP', states: [] },
    'China': { code: 'CN', states: [] },
    'India': {
      code: 'IN',
      states: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
    },
    'South Korea': { code: 'KR', states: [] },
    'Thailand': { code: 'TH', states: [] },
    'Vietnam': { code: 'VN', states: [] },
    'Indonesia': { code: 'ID', states: [] },
    'Malaysia': { code: 'MY', states: [] },
    'Singapore': { code: 'SG', states: [] },
    'Philippines': { code: 'PH', states: [] },
    'Pakistan': { code: 'PK', states: [] },
    'Bangladesh': { code: 'BD', states: [] },
    'Sri Lanka': { code: 'LK', states: [] },
    'United Arab Emirates': { code: 'AE', states: [] },
    'Saudi Arabia': { code: 'SA', states: [] },
    'Israel': { code: 'IL', states: [] },
    'Turkey': { code: 'TR', states: [] },

    // AFRICA
    'Nigeria': { code: 'NG', states: [] },
    'South Africa': { 
      code: 'ZA', 
      states: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'] 
    },
    'Kenya': { code: 'KE', states: [] },
    'Ghana': { code: 'GH', states: [] },
    'Ethiopia': { code: 'ET', states: [] },
    'Morocco': { code: 'MA', states: [] },
    'Egypt': { code: 'EG', states: [] },
    'Tunisia': { code: 'TN', states: [] },
    'Algeria': { code: 'DZ', states: [] },
    'Uganda': { code: 'UG', states: [] },
    'Tanzania': { code: 'TZ', states: [] },
    'Rwanda': { code: 'RW', states: [] },
    'Botswana': { code: 'BW', states: [] },
    'Senegal': { code: 'SN', states: [] },

    // OCEANIA
    'Australia': {
      code: 'AU',
      states: ['New South Wales', 'Victoria', 'Queensland', 'South Australia', 'Western Australia', 'Tasmania', 'Northern Territory', 'Australian Capital Territory']
    },
    'New Zealand': { code: 'NZ', states: [] },

    // SOUTH AMERICA
    'Brazil': { 
      code: 'BR', 
      states: ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'] 
    },
    'Argentina': { code: 'AR', states: [] },
    'Chile': { code: 'CL', states: [] },
    'Colombia': { code: 'CO', states: [] },
    'Peru': { code: 'PE', states: [] },
    'Ecuador': { code: 'EC', states: [] },
    'Venezuela': { code: 'VE', states: [] },
    'Uruguay': { code: 'UY', states: [] },

    'Other': { code: 'XX', states: [] }
  },

  /**
   * Show location picker modal
   * @param {Function} callback - Called with { country, state, formatted }
   */
  show(callback) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'location-picker-overlay';
    modal.innerHTML = `
      <div class="location-picker-modal">
        <div class="location-picker-header">
          <h3>📍 Choose Your Location</h3>
          <button class="location-picker-close" aria-label="Close">×</button>
        </div>
        <div class="location-picker-body">
          <div class="location-picker-step">
            <label class="location-picker-label">Country</label>
            <select id="countrySelect" class="location-picker-select">
              <option value="">Select country...</option>
              ${Object.keys(this.countries).map(country => 
                `<option value="${country}">${country}</option>`
              ).join('')}
            </select>
          </div>
          <div class="location-picker-step" id="stateStep" style="display: none;">
            <label class="location-picker-label">State / Region</label>
            <select id="stateSelect" class="location-picker-select">
              <option value="">Select state...</option>
            </select>
          </div>
          <p class="location-picker-privacy">🔒 Only country and state/region are shared for privacy</p>
        </div>
        <div class="location-picker-footer">
          <button class="btn-tesla btn-secondary location-picker-cancel">Cancel</button>
          <button class="btn-tesla btn-primary location-picker-save" disabled>Save Location</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Elements
    const countrySelect = modal.querySelector('#countrySelect');
    const stateSelect = modal.querySelector('#stateSelect');
    const stateStep = modal.querySelector('#stateStep');
    const saveBtn = modal.querySelector('.location-picker-save');
    const cancelBtn = modal.querySelector('.location-picker-cancel');
    const closeBtn = modal.querySelector('.location-picker-close');

    let selectedCountry = '';
    let selectedState = '';

    // Country change handler
    countrySelect.addEventListener('change', (e) => {
      selectedCountry = e.target.value;
      selectedState = '';
      
      if (selectedCountry) {
        const country = this.countries[selectedCountry];
        
        if (country.states && country.states.length > 0) {
          // Show state selector
          stateStep.style.display = 'block';
          stateSelect.innerHTML = '<option value="">Select state...</option>' +
            country.states.map(state => `<option value="${state}">${state}</option>`).join('');
          saveBtn.disabled = true;
        } else {
          // No states, just country
          stateStep.style.display = 'none';
          saveBtn.disabled = false;
        }
      } else {
        stateStep.style.display = 'none';
        saveBtn.disabled = true;
      }
    });

    // State change handler
    stateSelect.addEventListener('change', (e) => {
      selectedState = e.target.value;
      saveBtn.disabled = !selectedState;
    });

    // Save handler
    saveBtn.addEventListener('click', () => {
      const formatted = selectedState 
        ? `${selectedState}, ${selectedCountry}`
        : selectedCountry;
      
      callback({
        country: selectedCountry,
        state: selectedState,
        formatted: formatted
      });
      
      this.close(modal);
    });

    // Cancel/close handlers
    const closeHandler = () => this.close(modal);
    cancelBtn.addEventListener('click', closeHandler);
    closeBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeHandler();
    });

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeHandler();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
  },

  close(modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
};

console.log('✅ Location Picker loaded');
