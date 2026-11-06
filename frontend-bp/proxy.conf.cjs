// La URL del backend y la clave nunca pasan a este archivo ni al código Angular.
module.exports = {
  '/bp/**': { target: `http://127.0.0.1:${process.env.BP_MIDDLEWARE_PORT || 4201}` },
};
