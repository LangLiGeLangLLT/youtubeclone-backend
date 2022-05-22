'use strict';

/**
 * 本地开发的配置文件
 */

const secret = require('./secret');
exports.vod = {
  ...secret.vod,
};
