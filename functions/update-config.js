/**
 * Cloudflare Worker Multi-Sites - Version Finale Corrigée
 * 
 * ✅ Template API GitHub
 * ✅ Configuration complète 
 * ✅ Registry des sites
 * ✅ Workers + GitHub Actions
 * ✅ Endpoint GET /api/get-config
 * ✅ 65 champs sécurisés
 * ✅ Structure correcte
 */

// ===================================================================
// UTILITAIRES POUR REMPLACER Buffer
// ===================================================================

function stringToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64ToString(base64) {
  return decodeURIComponent(escape(atob(base64)));
}

async function findRepoVariant(baseName, githubToken, repoOwner) {
  console.log(`🔍 Recherche repo pour: ${baseName}`);
  
  // Test 1: nom exact
  console.log(`📝 Test 1: ${baseName}`);
  let result = await getSiteConfigFromGitHub(baseName, githubToken, repoOwner);
  if (result.success) {
    console.log(`✅ Trouvé avec nom exact: ${baseName}`);
    return { repoName: baseName, ...result };
  }
  console.log(`❌ Échec nom exact: ${result.error}`);
  
  // Test 2: recettes-blog-test → recettes-blog_test (cas spécial)
  if (baseName === 'recettes-blog-test') {
    console.log(`📝 Test 2: recettes-blog_test (cas spécial)`);
    result = await getSiteConfigFromGitHub('recettes-blog_test', githubToken, repoOwner);
    if (result.success) {
      console.log(`✅ Trouvé avec variante spéciale: recettes-blog_test`);
      return { repoName: 'recettes-blog_test', ...result };
    }
    console.log(`❌ Échec variante spéciale: ${result.error}`);
  }
  
  // Test 3: _ au lieu de -
  const underscoreVariant = baseName.replace(/-/g, '_');
  if (underscoreVariant !== baseName) {
    console.log(`📝 Test 3: ${underscoreVariant}`);
    result = await getSiteConfigFromGitHub(underscoreVariant, githubToken, repoOwner);
    if (result.success) {
      console.log(`✅ Trouvé avec underscore: ${underscoreVariant}`);
      return { repoName: underscoreVariant, ...result };
    }
    console.log(`❌ Échec underscore: ${result.error}`);
  }
  
  return { 
    success: false, 
    error: `Repository "${baseName}" (et variantes) non trouvé` 
  };
}


// ===================================================================
// CONFIGURATION
// ===================================================================

const CONFIG = {
  BRANCH: 'main',
  ALLOWED_ORIGINS: [
    'https://recettes-blog-test.pages.dev',
    'http://localhost:1313'
  ],
  USER_AGENT: 'Multi-Site-Worker/2.2'
};


// Fonction pour détecter le repo source dynamiquement
function getSourceRepo(request) {
  const origin = request.headers.get('Origin');
  
  if (!origin) {
    return 'recettes-blog_test'; // Fallback pour le template de base
  }
  
  // Extraire le nom du site depuis l'origin
  const siteName = origin.replace('https://', '').split('.')[0];
  
  // Appliquer la même logique de variantes que pour findRepoVariant
  // Si c'est le site original avec tiret, utiliser underscore
  if (siteName === 'recettes-blog-test') {
    return 'recettes-blog_test';
  }
  
  // Pour tous les autres sites, utiliser le nom tel quel
  return siteName;
}

// ===================================================================
// 1. LISTE DES CHAMPS SÉCURISÉS CORRIGÉE (avec navigation)
// ===================================================================

const SAFE_FIELDS = [
  // 🏷️ SITE (6 champs)
  'site.name', 'site.tagline', 'site.description', 'site.author', 'site.email', 'site.language',
  
  // 🧭 NAVIGATION (10 champs) - AJOUTÉS les page_titles !
  'navigation.menu_items.home', 
  'navigation.menu_items.recipes', 
  'navigation.menu_items.categories', 
  'navigation.menu_items.about', 
  'navigation.menu_items.contact',
  'navigation.page_titles.home',
  'navigation.page_titles.recipes',
  'navigation.page_titles.categories',
  'navigation.page_titles.about',
  'navigation.page_titles.contact',
  
  // 🎨 BRANDING (3 champs)
  'branding.logo_text', 'branding.hero_title_line1', 'branding.hero_title_line2',
  
  // 🌈 COLORS (6 champs)
  'colors.primary', 'colors.primary_dark', 'colors.primary_light', 'colors.secondary', 'colors.background', 'colors.text',
  
  // 📱 SOCIAL (4 champs)
  'social.facebook', 'social.instagram', 'social.twitter', 'social.pinterest', 'social.social_descriptions.pinterest', 
  'social.social_descriptions.instagram', 'social.social_descriptions.facebook',
  
  // 🔍 HEADER (4 champs)
  'header.search_placeholder', 'header.search_placeholder_mobile', 'header.follow_button_text', 'header.menu_aria_label',
  
  // 🏠 HERO (6 champs)
  'hero.badge_text', 'hero.title_line1', 'hero.title_line2', 'hero.subtitle', 'hero.subtitle_highlight', 'hero.cta_primary_text',
  
  // 📋 HOMEPAGE (9 champs)
  'homepage.latest_recipes.title', 'homepage.latest_recipes.description', 'homepage.popular_recipes.title', 
  'homepage.popular_recipes.empty_message', 'homepage.categories_section.title', 'homepage.newsletter.title', 
  'homepage.newsletter.description', 'homepage.newsletter.email_placeholder', 'homepage.newsletter.button_text',
  
  // 👤 ABOUT (8 champs)
  'about_section.badge_text', 'about_section.title', 'about_section.chef_name', 'about_section.chef_intro',
  'about_section.chef_description', 'about_section.philosophy_title', 'about_section.philosophy_text', 'about_section.image_alt',
  
  // 📄 PAGES & LISTES (8 champs) - AJOUTÉS breadcrumb !
  'list_pages.recipes_title', 'list_pages.recipes_description', 'list_pages.categories_title_prefix', 'list_pages.no_recipes',
  'list_pages.breadcrumb.home',
  'list_pages.breadcrumb.categories',
  'categories_page.title',
  'tags_page.all_tags_title',
  
  // 🦶 FOOTER (18 champs) - AJOUTÉS copyright et newsletter !
  'footer.description', 'footer.navigation_title', 'footer.categories_title', 'footer.social_title',
  'footer.newsletter_title', 'footer.newsletter_description', 'footer.newsletter_button', 'footer.copyright_tagline',
  'footer.copyright_prefix', 'footer.copyright_suffix',
  'footer.legal_links_text.privacy', 'footer.legal_links_text.terms', 'footer.legal_links_text.legal', 'footer.legal_links_text.contact',
  
  // 🔍 SEARCH COMPONENTS (4 champs)
  'components.search.no_results', 'components.search.loading', 'components.search.clear_label', 'components.search.no_results_emoji',
  
  // 📞 CONTACT (6 champs) - AJOUTÉS title, subtitle, submit !
  'contact_page.title',
  'contact_page.subtitle', 
  'contact_page.form.name_label', 
  'contact_page.form.email_label', 
  'contact_page.form.message_label',
  'contact_page.form.submit_button',
  
  // 🏷️ TAGS PAGES ( 2 champs) - NOUVEAUX !
  'tags_page.title_prefix',
  'tags_page.no_recipes'
];


// ===================================================================
// POINT D'ENTRÉE PRINCIPAL
// ===================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const response = await routeRequest(url, request, env, corsHeaders);
      return response;
    } catch (error) {
      console.error('Erreur générale:', error);
      return jsonResponse(
        { error: 'Erreur serveur interne', details: error.message }, 
        500, 
        corsHeaders
      );
    }
  }
};

// ===================================================================
// ROUTAGE
// ===================================================================

async function routeRequest(url, request, env, corsHeaders) {
  switch (url.pathname) {
    case '/api/health':
      return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        method: 'template-api',
        version: '2.2-final',
        safe_fields_count: SAFE_FIELDS.length
      }, 200, corsHeaders);
      
    case '/api/clone-site':
      return handleCloneSite(request, env, corsHeaders);
      
    case '/api/list-sites':
      return handleListSites(request, env, corsHeaders);

    case '/api/delete-site':
      return handleDeleteSite(request, env, corsHeaders);

    case '/api/update-config':
      return handleUpdateConfig(request, env, corsHeaders);
      
    case '/api/get-config':
      return handleGetConfig(request, env, corsHeaders);
      
    default:
      return jsonResponse({ error: 'Route non trouvée' }, 404, corsHeaders);
  }
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const isAllowed = CONFIG.ALLOWED_ORIGINS.includes(origin) || 
                   (origin && origin.endsWith('.kasri-elmehdi.workers.dev'));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : CONFIG.ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
}

// ===================================================================
// ✅ ENDPOINT GET CONFIG
// ===================================================================

async function handleGetConfig(request, env, corsHeaders) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, corsHeaders);
  }

  try {
    const origin = request.headers.get('Origin');
    
    if (!origin) {
      return jsonResponse({ error: 'Origin manquant' }, 400, corsHeaders);
    }
    
    const siteFromOrigin = origin.replace('https://', '').split('.')[0];
    console.log(`📥 Récupération config pour: ${siteFromOrigin}`);
    
    const { GITHUB_TOKEN, REPO_OWNER } = env;
    if (!GITHUB_TOKEN || !REPO_OWNER) {
      return jsonResponse({
        error: 'Variables d\'environnement GitHub manquantes'
      }, 500, corsHeaders);
    }
    
    const configResult = await findRepoVariant(siteFromOrigin, GITHUB_TOKEN, REPO_OWNER);
    
    if (configResult.success) {
      return jsonResponse({
        success: true,
        site_id: siteFromOrigin,
        config: configResult.config,
        fields_count: Object.keys(configResult.config).length,
        message: 'Configuration récupérée avec succès'
      }, 200, corsHeaders);
    } else {
      return jsonResponse({
        success: false,
        error: configResult.error,
        site_id: siteFromOrigin
      }, 404, corsHeaders);
    }
    
  } catch (error) {
    console.error('❌ Erreur handleGetConfig:', error);
    return jsonResponse({ 
      error: 'Erreur serveur: ' + error.message 
    }, 500, corsHeaders);
  }
}

async function getSiteConfigFromGitHub(repoName, githubToken, repoOwner) {
  const configUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/config.yaml`;
  
  try {
    console.log(`📝 Récupération config.yaml pour ${repoName}...`);
    
    const response = await fetch(configUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `Repository "${repoName}" ou fichier config.yaml non trouvé`
        };
      }
      return {
        success: false,
        error: `Erreur GitHub API: ${response.status}`
      };
    }
    
    const yamlContent = await response.text();
    console.log('📄 Contenu YAML récupéré, extraction des champs sécurisés...');
    
    const safeConfig = parseYamlToSafeFields(yamlContent);
    
    console.log(`✅ ${Object.keys(safeConfig).length} champs sécurisés extraits`);
    
    return {
      success: true,
      config: safeConfig
    };
    
  } catch (error) {
    console.error('❌ Erreur getSiteConfigFromGitHub:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===================================================================
// 2. PARSER YAML AMÉLIORÉ - Gère les niveaux d'imbrication
// ===================================================================

function parseYamlToSafeFields(yamlContent) {
  const config = {};
  const lines = yamlContent.split('\n');
  
  let currentSection = '';
  let currentSubsection = '';
  let currentSubSubsection = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Ignorer commentaires et lignes vides
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    
    // Calculer le niveau d'indentation
    const indentLevel = line.length - line.trimStart().length;
    
    // Section principale (0 espaces)
    if (indentLevel === 0 && trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
      currentSection = trimmedLine.replace(':', '');
      currentSubsection = '';
      currentSubSubsection = '';
      return;
    }
    
    // Sous-section (2 espaces)
    if (indentLevel === 2 && trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
      currentSubsection = trimmedLine.replace(':', '');
      currentSubSubsection = '';
      return;
    }
    
    // Sous-sous-section (4 espaces)
    if (indentLevel === 4 && trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
      currentSubSubsection = trimmedLine.replace(':', '');
      return;
    }
    
    // Ligne avec valeur
    if (trimmedLine.includes(':')) {
      const colonIndex = trimmedLine.indexOf(':');
      const key = trimmedLine.substring(0, colonIndex).trim();
      let value = trimmedLine.substring(colonIndex + 1).trim();
      
      // Nettoyer la valeur - SUPPRIMER LES COMMENTAIRES
      if (value.includes('#') && !value.trim().startsWith('#')) {
        value = value.split('#')[0].trim();
      }
            
      // Enlever les guillemets
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      
      // Construire le nom du champ selon le niveau
      let fieldName = '';
      if (currentSubSubsection) {
        fieldName = `${currentSection}.${currentSubsection}.${currentSubSubsection}.${key}`;
      } else if (currentSubsection) {
        fieldName = `${currentSection}.${currentSubsection}.${key}`;
      } else if (currentSection) {
        fieldName = `${currentSection}.${key}`;
      }
      
      // Ajouter seulement si autorisé et non vide
      if (fieldName && SAFE_FIELDS.includes(fieldName) && value) {
        config[fieldName] = value;
        console.log(`✓ Extrait: ${fieldName} = ${value}`);
      }
    }
  });
  
  return config;
}

// ===================================================================
// ENDPOINT UPDATE CONFIG
// ===================================================================

async function handleUpdateConfig(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, corsHeaders);
  }

  try {
    const origin = request.headers.get('Origin');
    const data = await request.json();
    
    console.log('🔍 DEBUG handleUpdateConfig:');
    console.log('Origin:', origin);
    console.log('Data reçue:', Object.keys(data));
    
    const siteFromOrigin = origin ? origin.replace('https://', '').split('.')[0] : null;
    const targetRepo = data.repo_name || siteFromOrigin;
    
    console.log('Site from origin:', siteFromOrigin);
    console.log('Target repo:', targetRepo);
    
    if (siteFromOrigin && targetRepo && siteFromOrigin !== targetRepo) {
      console.log('❌ Accès refusé:', siteFromOrigin, '!=', targetRepo);
      return jsonResponse({
        error: `Accès refusé: ${siteFromOrigin} ne peut pas modifier ${targetRepo || 'undefined'}`
      }, 403, corsHeaders);
    }
    
    if (!targetRepo) {
      return jsonResponse({
        error: 'Impossible de déterminer le site cible'
      }, 400, corsHeaders);
    }
    
    console.log('✅ Autorisation accordée pour:', targetRepo);
    
    const { GITHUB_TOKEN, REPO_OWNER } = env;
    if (!GITHUB_TOKEN || !REPO_OWNER) {
      return jsonResponse({
        error: 'Variables d\'environnement GitHub manquantes'
      }, 500, corsHeaders);
    }
    
    const safeUpdates = filterSafeUpdates(data);
    
    if (Object.keys(safeUpdates).length === 0) {
      return jsonResponse({
        error: 'Aucun champ autorisé dans les mises à jour',
        allowed_fields: SAFE_FIELDS.length
      }, 400, corsHeaders);
    }
    
    console.log(`🔒 ${Object.keys(safeUpdates).length} champs sécurisés validés`);
    
    const updateResult = await updateSiteConfig(targetRepo, safeUpdates, GITHUB_TOKEN, REPO_OWNER);
    
    if (updateResult.success) {
      return jsonResponse({
        success: true,
        message: `Configuration de ${targetRepo} mise à jour avec succès`,
        files_updated: updateResult.files_updated || [],
        fields_processed: updateResult.fields_processed || 0
      }, 200, corsHeaders);
    } else {
      return jsonResponse({
        error: updateResult.error || 'Erreur lors de la mise à jour'
      }, 500, corsHeaders);
    }
    
  } catch (error) {
    console.error('❌ Erreur handleUpdateConfig:', error);
    return jsonResponse({ 
      error: 'Erreur serveur: ' + error.message 
    }, 500, corsHeaders);
  }
}

// ===================================================================
// 4. VALIDATION AMÉLIORÉE
// ===================================================================

function filterSafeUpdates(updates) {
  const safeUpdates = {};
  const rejectedFields = [];
  
  Object.entries(updates).forEach(([fieldName, value]) => {
    if (SAFE_FIELDS.includes(fieldName)) {
      if (value && typeof value === 'string' && value.trim()) {
        // Nettoyer la valeur des caractères parasites
        const cleanValue = value.trim()
          .replace(/\\"/g, '"')  // Enlever les échappements
          .replace(/^"*|"*$/g, '') // Enlever guillemets multiples
          .replace(/([^"])#.*$/, '$1'); // Enlever commentaires
        
        safeUpdates[fieldName] = cleanValue;
      }
    } else {
      rejectedFields.push(fieldName);
    }
  });
  
  if (rejectedFields.length > 0) {
    console.log(`🚫 ${rejectedFields.length} champs rejetés:`, rejectedFields);
  }
  
  console.log(`✅ ${Object.keys(safeUpdates).length} champs autorisés validés`);
  
  return safeUpdates;
}


async function updateSiteConfig(repoName, updates, githubToken, repoOwner) {
  console.log(`🔧 Mise à jour intelligente pour ${repoName}: ${Object.keys(updates).length} champs`);
  
  try {
    const filesUpdated = [];
    
    if (hasYamlUpdates(updates)) {
      console.log('📝 Mise à jour data/config.yaml...');
      const yamlResult = await updateYamlConfig(repoName, updates, githubToken, repoOwner);
      if (yamlResult.success) {
        filesUpdated.push('data/config.yaml');
      } else {
        console.warn('⚠️ Échec mise à jour YAML:', yamlResult.error);
      }
    }
    
    if (hasTomlUpdates(updates)) {
      console.log('📝 Mise à jour config.toml...');
      const tomlResult = await updateTomlConfig(repoName, updates, githubToken, repoOwner);
      if (tomlResult.success) {
        filesUpdated.push('config.toml');
      } else {
        console.warn('⚠️ Échec mise à jour TOML:', tomlResult.error);
      }
    }
    
    console.log(`✅ Configuration mise à jour: ${filesUpdated.join(', ')}`);
    
    return {
      success: true,
      files_updated: filesUpdated,
      fields_processed: Object.keys(updates).length
    };
    
  } catch (error) {
    console.error('❌ Erreur updateSiteConfig:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function hasYamlUpdates(updates) {
  return SAFE_FIELDS.some(field => updates.hasOwnProperty(field));
}

function hasTomlUpdates(updates) {
  const tomlFields = ['site.name', 'site.language'];
  return tomlFields.some(field => updates.hasOwnProperty(field));
}

async function updateYamlConfig(repoName, updates, githubToken, repoOwner) {
  const configUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/config.yaml`;
  
  try {
    console.log(`📝 Récupération config.yaml pour ${repoName}...`);
    
    const response = await fetch(configUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': CONFIG.USER_AGENT
      }
    });
    
    if (!response.ok) {
      throw new Error(`Impossible de récupérer config.yaml: ${response.status}`);
    }
    
    const fileData = await response.json();
    let content = base64ToString(fileData.content);
    
    console.log('📄 Application des mises à jour YAML...');
    content = applyYamlUpdatesOptimized(content, updates);
    
    console.log('💾 Sauvegarde des modifications...');
    const encodedContent = stringToBase64(content);
    
    const updateResponse = await fetch(configUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': CONFIG.USER_AGENT
      },
      body: JSON.stringify({
        message: '⚙️ Mise à jour configuration via admin',
        content: encodedContent,
        sha: fileData.sha
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Erreur sauvegarde: ${error.message}`);
    }
    
    console.log('✅ data/config.yaml mis à jour avec succès');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erreur updateYamlConfig:', error);
    return { success: false, error: error.message };
  }
}

// ===================================================================
// 3. REGEX CORRIGÉES - Évitent les duplications
// ===================================================================

function applyYamlUpdatesOptimized(content, updates) {
  console.log(`🔧 Application des mises à jour: ${Object.keys(updates).length} champs`);
  
  let updatedCount = 0;
  
  Object.entries(updates).forEach(([fieldName, value]) => {
    const oldContent = content;
    
    // Échapper les caractères spéciaux pour la regex
    const cleanValue = value.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    
    try {
      if (fieldName.startsWith('colors.')) {
        // REGEX CORRIGÉE pour les couleurs - capture tout jusqu'à la fin de ligne
        const colorKey = fieldName.split('.').pop();
        const colorRegex = new RegExp(`(\\s+${colorKey}:\\s*)([^\\n]*)`, 'g');
        content = content.replace(colorRegex, `$1"${cleanValue}"`);
        
      } else if (fieldName.startsWith('navigation.menu_items.')) {
        // REGEX SPÉCIALE pour navigation (3 niveaux)
        const menuKey = fieldName.split('.').pop();
        const navRegex = new RegExp(`(navigation:[\\s\\S]*?menu_items:[\\s\\S]*?\\s+${menuKey}:\\s*)([^\\n]*)`, 'g');
        content = content.replace(navRegex, `$1"${cleanValue}"`);
        
      } else if (fieldName.includes('.')) {
        // REGEX GÉNÉRALE pour champs imbriqués
        const parts = fieldName.split('.');
        const section = parts[0];
        const key = parts[parts.length - 1];
        
        if (parts.length === 3) {
          // 3 niveaux (ex: footer.legal_links.privacy)
          const subsection = parts[1];
          const nestedRegex = new RegExp(`(${section}:[\\s\\S]*?${subsection}:[\\s\\S]*?\\s+${key}:\\s*)([^\\n]*)`, 'g');
          content = content.replace(nestedRegex, `$1"${cleanValue}"`);
        } else {
          // 2 niveaux (ex: site.name)
          const nestedRegex = new RegExp(`(${section}:[\\s\\S]*?\\s+${key}:\\s*)([^\\n]*)`, 'g');
          content = content.replace(nestedRegex, `$1"${cleanValue}"`);
        }
      } else {
        // Champ simple (niveau racine)
        const simpleRegex = new RegExp(`(\\s+${fieldName}:\\s*)([^\\n]*)`, 'g');
        content = content.replace(simpleRegex, `$1"${cleanValue}"`);
      }
      
      if (content !== oldContent) {
        updatedCount++;
        console.log(`✓ ${fieldName} mis à jour`);
      } else {
        console.log(`⚠️ ${fieldName} non trouvé dans le YAML`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur regex pour ${fieldName}:`, error);
    }
  });
  
  console.log(`📊 ${updatedCount}/${Object.keys(updates).length} champs mis à jour`);
  return content;
}



async function updateTomlConfig(repoName, updates, githubToken, repoOwner) {
  const configUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/config.toml`;
  
  try {
    console.log(`📝 Récupération config.toml pour ${repoName}...`);
    
    const response = await fetch(configUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': CONFIG.USER_AGENT
      }
    });
    
    if (!response.ok) {
      throw new Error(`Impossible de récupérer config.toml: ${response.status}`);
    }
    
    const fileData = await response.json();
    let content = base64ToString(fileData.content);
    
    let hasChanges = false;
    
    if (updates['site.name']) {
      const oldContent = content;
      content = content.replace(/title\s*=\s*"[^"]*"/, `title = "${updates['site.name']}"`);
      if (content !== oldContent) {
        hasChanges = true;
        console.log(`✓ Mis à jour title = ${updates['site.name']}`);
      }
    }
    
    if (updates['site.language']) {
      const oldContent = content;
      content = content.replace(/languageCode\s*=\s*"[^"]*"/, `languageCode = "${updates['site.language']}"`);
      if (content !== oldContent) {
        hasChanges = true;
        console.log(`✓ Mis à jour languageCode = ${updates['site.language']}`);
      }
    }
    
    const workerUrl = `https://${repoName}.kasri-elmehdi.workers.dev/`;
    const oldContent = content;
    content = content.replace(/baseURL\s*=\s*"[^"]*"/, `baseURL = "${workerUrl}"`);
    if (content !== oldContent) {
      hasChanges = true;
      console.log(`✓ Mis à jour baseURL = ${workerUrl}`);
    }
    
    if (!hasChanges) {
      console.log('ℹ️ Aucun changement nécessaire pour config.toml');
      return { success: true };
    }
    
    const encodedContent = stringToBase64(content);
    
    const updateResponse = await fetch(configUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': CONFIG.USER_AGENT
      },
      body: JSON.stringify({
        message: '⚙️ Mise à jour config.toml via admin',
        content: encodedContent,
        sha: fileData.sha
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Erreur sauvegarde config.toml: ${error.message}`);
    }
    
    console.log('✅ config.toml mis à jour avec succès');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erreur updateTomlConfig:', error);
    return { success: false, error: error.message };
  }
}

// ===================================================================
// GESTION DES SITES (CLONE, LIST, DELETE)
// ===================================================================

async function handleCloneSite(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, corsHeaders);
  }

  try {
    const data = await request.json();
    
    if (!data.site_name || !data.repo_name) {
      return jsonResponse({ error: 'site_name et repo_name requis' }, 400, corsHeaders);
    }

    if (!/^[a-z0-9-_]+$/.test(data.repo_name)) {
      return jsonResponse({ error: 'repo_name: lettres minuscules, chiffres et tirets uniquement' }, 400, corsHeaders);
    }

    const required = ['GITHUB_TOKEN', 'REPO_OWNER', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
    for (const variable of required) {
      if (!env[variable]) {
        return jsonResponse({ error: `Variable manquante: ${variable}` }, 500, corsHeaders);
      }
    }

    const result = await cloneSiteTemplate(data, env, request);
    
    return jsonResponse({
      success: true,
      message: `Site "${data.site_name}" créé avec succès !`,
      ...result
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Erreur clonage:', error);
    return jsonResponse({ 
      error: 'Erreur lors du clonage',
      details: error.message 
    }, 500, corsHeaders);
  }
}

async function cloneSiteTemplate(data, env, request) {
  const { GITHUB_TOKEN, REPO_OWNER, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = env;
  
  try {
    console.log(`🚀 Début du clonage pour: ${data.site_name}`);
    
    console.log('📄 Duplication du template...');
    const sourceRepo = getSourceRepo(request);
    const templateResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${sourceRepo}/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify({
          name: data.repo_name,
          description: `Site ${data.site_name} - Généré automatiquement`,
          private: false,
          include_all_branches: false
        })
      }
    );

    if (!templateResponse.ok) {
      const error = await templateResponse.json();
      throw new Error(`Template API failed: ${error.message}`);
    }

    const repoResult = await templateResponse.json();
    console.log('✅ Template dupliqué avec succès');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (data.hero_line1 || data.hero_line2) {
      console.log('⚙️ Configuration personnalisée...');
      await configureSiteTemplate(data, GITHUB_TOKEN, REPO_OWNER);
    }
    
    console.log('🚀 Déploiement automatique via Workers...');
    const deploymentResult = await createCloudflareWorker(data.repo_name, REPO_OWNER, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GITHUB_TOKEN);
    
    console.log('💾 Enregistrement dans le registry...');
    const siteData = {
      id: data.repo_name,
      name: data.site_name,
      repo: `${REPO_OWNER}/${data.repo_name}`,
      domain: deploymentResult.url.replace('https://', ''),
      admin_url: `${deploymentResult.url}/admin/`,
      created_at: new Date().toISOString(),
      status: 'active',
      github_url: repoResult.html_url,
      deployment_type: deploymentResult.type,
      deployment_url: deploymentResult.url
    };
    
    await saveSiteToRegistry(data.repo_name, siteData, env);
    
    console.log('✅ Clonage terminé avec succès (Template API)');
    
    return {
      site_id: data.repo_name,
      primary_url: deploymentResult.url,
      admin_url: `${deploymentResult.url}/admin/`,
      github_url: repoResult.html_url,
      deployment_type: deploymentResult.type,
      deployment_note: deploymentResult.note || null
    };
    
  } catch (error) {
    console.error('❌ Erreur durant le clonage:', error);
    throw new Error(`Échec du clonage: ${error.message}`);
  }
}

async function configureSiteTemplate(data, token, owner) {
  const configUrl = `https://api.github.com/repos/${owner}/${data.repo_name}/contents/data/config.yaml`;
  
  try {
    const [contentResponse, metaResponse] = await Promise.all([
      fetch(configUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }),
      fetch(configUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': CONFIG.USER_AGENT
        }
      })
    ]);
    
    if (!contentResponse.ok) return;
    
    let content = await contentResponse.text();
    const fileMeta = await metaResponse.json();
    
    content = content.replace(/name:\s*"?Test"?/g, `name: "${data.site_name}"`);
    content = content.replace(/logo_text:\s*"?T"?/g, `logo_text: "${data.site_name.charAt(0).toUpperCase()}"`);
    
    if (data.hero_line1) {
      content = content.replace(/hero_title_line1:\s*.*/g, `hero_title_line1: "${data.hero_line1}"`);
    }
    
    if (data.hero_line2) {
      content = content.replace(/hero_title_line2:\s*.*/g, `hero_title_line2: "${data.hero_line2}"`);
    }
    
    const encodedContent = stringToBase64(content);
    
    await fetch(configUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': CONFIG.USER_AGENT
      },
      body: JSON.stringify({
        message: `⚙️ Configuration du site "${data.site_name}"`,
        content: encodedContent,
        sha: fileMeta.sha
      })
    });

    console.log('✅ Configuration appliquée');
    
    console.log('⚙️ Modification du config.toml...');
    
    try {
      const configTomlResponse = await fetch(`https://api.github.com/repos/${owner}/${data.repo_name}/contents/config.toml`, {
        headers: { 
          'Authorization': `token ${token}`,
          'User-Agent': CONFIG.USER_AGENT
        }
      });

      if (configTomlResponse.ok) {
        const configTomlData = await configTomlResponse.json();
        let configTomlContent = base64ToString(configTomlData.content);

        configTomlContent = configTomlContent
          .replace(/baseURL\s*=\s*"[^"]*"/, `baseURL = "https://${data.repo_name}.kasri-elmehdi.workers.dev/"`)
          .replace(/title\s*=\s*"[^"]*"/, `title = "${data.site_name}"`);

        const encodedTomlContent = stringToBase64(configTomlContent);

        await fetch(`https://api.github.com/repos/${owner}/${data.repo_name}/contents/config.toml`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': CONFIG.USER_AGENT
          },
          body: JSON.stringify({
            message: 'Personnalisation config.toml',
            content: encodedTomlContent,
            sha: configTomlData.sha
          })
        });

        console.log('✅ config.toml mis à jour');
      }
    } catch (error) {
      console.error('❌ Erreur modification config.toml:', error);
    }
    
  } catch (error) {
    console.warn('⚠️ Erreur configuration (non critique):', error.message);
  }
}

async function createCloudflareWorker(repoName, repoOwner, apiToken, accountId, githubToken) {
  console.log('⚡ Déploiement automatique via GitHub Actions + Workers');
  
  try {
    console.log('🔨 Création du Worker...');
    
    const workerScript = generateWorkerScript(repoName, repoOwner);
    
    const createWorkerResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${repoName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/javascript'
        },
        body: workerScript
      }
    );

    if (!createWorkerResponse.ok) {
      const error = await createWorkerResponse.json();
      console.error('Erreur Worker:', error);
      throw new Error(`Erreur création Worker: ${error.errors?.[0]?.message || 'Erreur inconnue'}`);
    }

    console.log('✅ Worker créé');

    console.log('🌐 Activation du domaine .workers.dev...');
    
    const domainResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${repoName}/subdomain`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: true
        })
      }
    );

    if (domainResponse.ok) {
      console.log('✅ Domaine .workers.dev activé');
    } else {
      console.warn('⚠️ Activation domaine échouée (peut être déjà actif)');
    }

    console.log('📄 Activation GitHub Pages...');
    await enableGitHubPages(repoName, repoOwner, githubToken);

    console.log('🤖 Ajout GitHub Actions...');
    await addGitHubAction(repoName, repoOwner, githubToken, accountId, apiToken);

    console.log('🚀 Déclenchement du premier build...');
    await triggerGitHubAction(repoName, repoOwner, githubToken);

    return {
      id: repoName,
      name: repoName,
      url: `https://${repoName}.kasri-elmehdi.workers.dev`,
      type: 'worker-auto'
    };

  } catch (error) {
    console.error('❌ Erreur déploiement automatique:', error);
    throw error;
  }
}

function generateWorkerScript(repoName, repoOwner) {
  const tpl = `// Worker auto-généré pour ${repoName}
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Servir depuis GitHub Pages (auto-déployé par Actions)
  const githubUrl = "https://\${OWNER}.github.io/\${REPO}" + url.pathname;
  
  try {
    const response = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'Cloudflare-Worker'
      }
    });
    
    if (response.ok) {
      // Créer une nouvelle réponse avec les bons headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      newResponse.headers.set('X-Powered-By', 'Cloudflare Workers + GitHub Actions');
      newResponse.headers.set('Cache-Control', 'public, max-age=300');
      
      return newResponse;
    }
    
    // Fallback vers index.html pour les SPA routes
    const indexResponse = await fetch("https://\${OWNER}.github.io/\${REPO}/");
    return new Response(indexResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Powered-By': 'Cloudflare Workers + GitHub Actions'
      }
    });
    
  } catch (error) {
    return new Response('Site en cours de déploiement...', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '60'
      }
    });
  }
}`;

  return tpl
    .replace(/\$\{OWNER\}/g, repoOwner)
    .replace(/\$\{REPO\}/g, repoName);
}

async function enableGitHubPages(repoName, repoOwner, githubToken) {
  try {
    console.log('🔧 Configuration GitHub Pages...');
    
    const pagesResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
            path: '/'
          },
          build_type: 'workflow'
        })
      }
    );

    if (!pagesResponse.ok) {
      const error = await pagesResponse.json();
      
      if (error.message?.includes('already exists')) {
        console.log('🔄 Mise à jour GitHub Pages vers workflow...');
        
        const updateResponse = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/pages`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': CONFIG.USER_AGENT,
              'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({
              source: {
                branch: 'main',
                path: '/'
              },
              build_type: 'workflow'
            })
          }
        );
        
        if (updateResponse.ok) {
          console.log('✅ GitHub Pages configuré pour workflow');
        } else {
          console.warn('⚠️ Mise à jour Pages échouée (non critique)');
        }
      } else if (pagesResponse.status === 422) {
        console.log('⚠️ GitHub Pages: workflow pas encore prêt (normal)');
      } else {
        console.warn(`⚠️ GitHub Pages: ${error.message} (non critique)`);
      }
    } else {
      console.log('✅ GitHub Pages activé avec workflow');
    }
    
  } catch (error) {
    console.warn('⚠️ Erreur GitHub Pages (non critique):', error.message);
  }
}

async function addGitHubAction(repoName, repoOwner, githubToken, accountId, apiToken) {
  const actionYml = `name: Deploy to GitHub Pages + Cloudflare

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Install system libs for AVIF
        run: |
          sudo apt-get update
          sudo apt-get install -y libheif-dev libde265-dev
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Build site
        run: |
          npm run build:css
          npm run build:js
          hugo --gc --minify
          
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  try {
    console.log('🗑️ Suppression ancien workflow...');
    const deleteOldResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/.github/workflows/build-and-deploy.yml`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': CONFIG.USER_AGENT
        }
      }
    );
    
    if (deleteOldResponse.ok) {
      const oldFile = await deleteOldResponse.json();
      await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/.github/workflows/build-and-deploy.yml`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': CONFIG.USER_AGENT
          },
          body: JSON.stringify({
            message: '🗑️ Suppression ancien workflow',
            sha: oldFile.sha
          })
        }
      );
      console.log('✅ Ancien workflow supprimé');
    }
  } catch (error) {
    console.warn('⚠️ Ancien workflow non trouvé (normal)');
  }

  const workflowContent = stringToBase64(actionYml);
  
  const createWorkflowResponse = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/.github/workflows/deploy.yml`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': CONFIG.USER_AGENT
      },
      body: JSON.stringify({
        message: '🤖 Nouveau workflow optimisé GitHub Actions + Cloudflare',
        content: workflowContent
      })
    }
  );

  if (!createWorkflowResponse.ok) {
    const error = await createWorkflowResponse.json();
    throw new Error(`Erreur création workflow: ${error.message}`);
  }

  console.log('✅ GitHub Action ajoutée (workflow unifié)');
}

async function triggerGitHubAction(repoName, repoOwner, githubToken) {
  try {
    const triggerResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/deploy.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': CONFIG.USER_AGENT
        },
        body: JSON.stringify({
          ref: 'main'
        })
      }
    );

    console.log('✅ Premier build déclenché');
  } catch (error) {
    console.warn('⚠️ Trigger manuel échoué (le push va déclencher automatiquement)');
  }
}

async function handleListSites(request, env, corsHeaders) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, corsHeaders);
  }

  try {
    const sites = await getSitesFromRegistry(env);
    return jsonResponse({ 
      success: true, 
      sites,
      count: Object.keys(sites).length 
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Erreur récupération sites:', error);
    return jsonResponse({ 
      error: 'Erreur récupération des sites' 
    }, 500, corsHeaders);
  }
}

async function saveSiteToRegistry(siteId, siteData, env) {
  try {
    const currentSites = await getSitesFromRegistry(env);
    currentSites[siteId] = siteData;
    
    await env.SITES_REGISTRY.put('sites', JSON.stringify(currentSites));
    console.log(`💾 Site ${siteId} enregistré dans le registry`);
  } catch (error) {
    console.error('⚠️ Erreur sauvegarde registry:', error.message);
    throw error;
  }
}

async function getSitesFromRegistry(env) {
  try {
    const sitesData = await env.SITES_REGISTRY.get('sites');
    return sitesData ? JSON.parse(sitesData) : {};
  } catch (error) {
    console.error('⚠️ Erreur lecture registry:', error.message);
    return {};
  }
}

async function handleDeleteSite(request, env, corsHeaders) {
  if (request.method !== 'DELETE') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405, corsHeaders);
  }

  try {
    const { GITHUB_TOKEN, REPO_OWNER, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = env;
    
    if (!GITHUB_TOKEN || !REPO_OWNER || !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      return jsonResponse({ error: 'Variables d\'environnement manquantes' }, 500, corsHeaders);
    }

    const data = await request.json();
    
    if (!data.site_id) {
      return jsonResponse({ error: 'site_id requis' }, 400, corsHeaders);
    }

    console.log(`🗑️ Début de la suppression pour: ${data.site_id}`);

    console.log('🗑️ Suppression du Worker...');
    await deleteCloudflareWorker(data.site_id, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID);

    console.log('🗑️ Suppression du repository...');
    await deleteGitHubRepository(data.site_id, REPO_OWNER, GITHUB_TOKEN);

    console.log('🗑️ Suppression du registry...');
    await deleteSiteFromRegistry(data.site_id, env);

    console.log('✅ Suppression terminée avec succès');

    return jsonResponse({
      success: true,
      message: `Site ${data.site_id} supprimé avec succès`,
      deleted_items: ['worker', 'repository', 'registry']
    }, 200, corsHeaders);

  } catch (error) {
    console.error('❌ Erreur durant la suppression:', error);
    return jsonResponse({
      error: 'Échec de la suppression: ' + error.message
    }, 500, corsHeaders);
  }
}

async function deleteCloudflareWorker(workerName, apiToken, accountId) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Erreur suppression Worker: ${error.errors?.[0]?.message || 'Erreur inconnue'}`);
  }

  console.log('✅ Worker supprimé');
}

async function deleteGitHubRepository(repoName, repoOwner, githubToken) {
  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': CONFIG.USER_AGENT
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Erreur suppression repository: ${error.message || 'Erreur inconnue'}`);
  }

  console.log('✅ Repository supprimé');
}

async function deleteSiteFromRegistry(siteId, env) {
  try {
    const currentSites = await getSitesFromRegistry(env);
    delete currentSites[siteId];
    await env.SITES_REGISTRY.put('sites', JSON.stringify(currentSites));
    console.log('✅ Site supprimé du registry');
  } catch (error) {
    console.warn('⚠️ Erreur suppression registry (non critique):', error.message);
  }
}

// ===================================================================
// UTILITAIRES FINAUX
// ===================================================================

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 
      'Content-Type': 'application/json', 
      ...headers 
    }
  });
}

// ===================================================================
// LOGS FINAUX
// ===================================================================

console.log('🚀 Worker Multi-Sites API v2.2-final - Prêt à déployer');
console.log('📊 Configuration:');
console.log(`- ${SAFE_FIELDS.length} champs sécurisés`);
console.log('- Endpoint GET /api/get-config ✅');
console.log('- Endpoint POST /api/update-config ✅');
console.log('- Parser YAML sécurisé ✅');
console.log('- Regex optimisées ✅');
console.log('- Structure corrigée ✅');
