export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
    checks: {
        minLength: boolean;
        hasUppercase: boolean;
        hasLowercase: boolean;
        hasNumber: boolean;
        hasSpecial: boolean;
    };
}

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';

export function validatePassword(password: string): PasswordValidation {
    const checks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)
    };

    const errors: string[] = [];
    
    if (!checks.minLength) {
        errors.push('Password must be at least 8 characters');
    }
    if (!checks.hasUppercase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!checks.hasLowercase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!checks.hasNumber) {
        errors.push('Password must contain at least one number');
    }
    if (!checks.hasSpecial) {
        errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }

    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    let strength: 'weak' | 'medium' | 'strong';
    if (passedChecks <= 2) {
        strength = 'weak';
    } else if (passedChecks <= 4) {
        strength = 'medium';
    } else {
        strength = 'strong';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength,
        checks
    };
}

export function getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'strong': return '#10b981';
    }
}

export function getStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak': return 'Weak';
        case 'medium': return 'Medium';
        case 'strong': return 'Strong';
    }
}
