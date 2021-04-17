module.exports = (sequelize, Sequelize) => {
  const Tutorial = sequelize.define("tutorial", {
    title: {
      type: Sequelize.DataTypes.STRING
    },
    description: {
      type: Sequelize.DataTypes.TEXT
    },
    published: {
      type: Sequelize.DataTypes.BOOLEAN
    }
  });

  return Tutorial;
};