/**
 * Nickname Validator & Sanitizer
 * Provides XSS protection and input validation for user nicknames
 */

// Maximum allowed nickname length
export const MAX_NICKNAME_LENGTH = 20;
export const MIN_NICKNAME_LENGTH = 2;

// Allowed characters: letters, numbers, spaces, underscores, hyphens
const ALLOWED_PATTERN = /^[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\s_-]+$/;

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
    /<script/i,
    /<\/script/i,
    /javascript:/i,
    /on\w+=/i,  // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<style/i,
    /<img/i,
    /<svg/i,
    /data:/i,
    /vbscript:/i,
    /expression\(/i,
];

export interface NicknameValidation {
    isValid: boolean;
    sanitized: string;
    errors: string[];
}

/**
 * Sanitize a nickname by removing/escaping dangerous characters
 */
export function sanitizeNickname(nickname: string): string {
    if (!nickname) return '';
    
    // Trim whitespace
    let sanitized = nickname.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Escape HTML entities
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    // Decode back for storage (we escape on render, not storage)
    // Actually, let's just remove dangerous chars entirely
    sanitized = nickname.trim()
        .replace(/<[^>]*>/g, '')  // Remove all HTML tags
        .replace(/[<>"'&]/g, ''); // Remove dangerous chars
    
    // Truncate to max length
    if (sanitized.length > MAX_NICKNAME_LENGTH) {
        sanitized = sanitized.substring(0, MAX_NICKNAME_LENGTH);
    }
    
    return sanitized;
}

/**
 * Validate a nickname and return validation result with sanitized version
 */
export function validateNickname(nickname: string): NicknameValidation {
    const errors: string[] = [];
    const sanitized = sanitizeNickname(nickname);
    
    // Check if empty
    if (!sanitized || sanitized.trim().length === 0) {
        errors.push('Nickname cannot be empty');
        return { isValid: false, sanitized: '', errors };
    }
    
    // Check minimum length
    if (sanitized.length < MIN_NICKNAME_LENGTH) {
        errors.push(`Nickname must be at least ${MIN_NICKNAME_LENGTH} characters`);
    }
    
    // Check maximum length
    if (nickname.length > MAX_NICKNAME_LENGTH) {
        errors.push(`Nickname cannot exceed ${MAX_NICKNAME_LENGTH} characters`);
    }
    
    // Check for dangerous patterns in original input
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(nickname)) {
            errors.push('Nickname contains invalid characters');
            break;
        }
    }
    
    // Check allowed characters
    if (!ALLOWED_PATTERN.test(sanitized) && sanitized.length > 0) {
        errors.push('Nickname can only contain letters, numbers, spaces, underscores, and hyphens');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Quick check if a nickname is safe (for inline validation)
 */
export function isNicknameSafe(nickname: string): boolean {
    return validateNickname(nickname).isValid;
}
