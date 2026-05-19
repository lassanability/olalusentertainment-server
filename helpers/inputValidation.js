exports.validateEmail = (email) => {
    if (typeof email !== 'string' || email.length > 254) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || local.length > 64) return false;
    if (!domain || domain.length > 253) return false;
    if (!/^[a-zA-Z0-9._%+\-]+$/.test(local)) return false;
    if (!/^[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(domain)) return false;
    return true;
};

exports.validatePassword = (password) => {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[@$!%*?&]/.test(password)) return false;
    return true;
};


module.exports = exports;