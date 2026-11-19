function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {

        if (req.originalUrl.startsWith("/api/")) {
            return res.status(401).json({
                message: "Unauthorized. Please log in."
            });
        }

        return res.redirect("/login.html");
    }

    next();
}

module.exports = requireAuth;
