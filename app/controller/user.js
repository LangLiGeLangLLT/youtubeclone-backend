'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  get userService() {
    return this.service.user;
  }

  async create() {
    const body = this.ctx.request.body;
    this.ctx.validate({
      username: { type: 'string' },
      email: { type: 'email' },
      password: { type: 'string' },
    }, body);

    if (await this.userService.findByUsername(body.username)) {
      this.ctx.throw(422, '用户已存在');
    }

    if (await this.userService.findByEmail(body.email)) {
      this.ctx.throw(422, '邮箱已存在');
    }

    const user = await this.userService.createUser(body);

    const token = this.userService.createToken({
      userId: user._id,
    });

    this.ctx.body = {
      user: {
        email: user.email,
        token,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  async login() {
    const body = this.ctx.request.body;
    this.ctx.validate({
      email: { type: 'email' },
      password: { type: 'string' },
    }, body);

    const user = await this.userService.findByEmail(body.email);

    if (!user) {
      this.ctx.throw(422, '用户不存在');
    }

    if (this.ctx.helper.md5(body.password) !== user.password) {
      this.ctx.throw(422, '密码不正确');
    }

    const token = this.userService.createToken({
      userId: user._id,
    });

    this.ctx.body = {
      user: {
        email: user.email,
        token,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  async getCurrentUser() {
    const user = this.ctx.user;
    const token = this.ctx.token;

    this.ctx.body = {
      user: {
        email: user.email,
        token,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  async update() {
    const body = this.ctx.request.body;
    this.ctx.validate({
      email: { type: 'email', required: false },
      password: { type: 'string', required: false },
      username: { type: 'string', required: false },
      channelDescription: { type: 'string', required: false },
      avatar: { type: 'string', required: false },
    }, body);

    if (body.email) {
      if (body.email !== this.ctx.user.email && await this.userService.findByEmail(body.email)) {
        this.ctx.throw(422, '邮箱已存在');
      }
    }

    if (body.username) {
      if (body.username !== this.ctx.user.username && await this.userService.findByUsername(body.username)) {
        this.ctx.throw(422, '用户名已存在');
      }
    }

    if (body.password) {
      body.password = this.ctx.helper.md5(body.password);
    }

    const user = await this.userService.updateUser(body);

    this.ctx.body = {
      user: {
        email: user.email,
        password: user.password,
        username: user.username,
        channelDescription: user.channelDescription,
        avatar: user.avatar,
      },
    };
  }

  async subscribe() {
    // 1. 用户不能订阅自己
    // 2. 添加订阅
    // 3. 发送响应

    const userId = this.ctx.user._id;
    const channelId = this.ctx.params.userId;
    if (userId.equals(channelId)) {
      this.ctx.throw(422, '用户不能订阅自己');
    }

    const user = await this.service.user.subscribe(userId, channelId);
    this.ctx.body = {
      user: {
        ...this.ctx.helper._.pick(user.toJSON(), [
          'username',
          'email',
          'avatar',
          'cover',
          'channelDescription',
          'subscribersCount',
        ]),
        isSubscribed: true,
      },
    };
  }

  async unsubscribe() {
    const userId = this.ctx.user._id;
    const channelId = this.ctx.params.userId;
    if (userId.equals(channelId)) {
      this.ctx.throw(422, '用户不能订阅自己');
    }

    const user = await this.service.user.unsubscribe(userId, channelId);
    this.ctx.body = {
      user: {
        ...this.ctx.helper._.pick(user.toJSON(), [
          'username',
          'email',
          'avatar',
          'cover',
          'channelDescription',
          'subscribersCount',
        ]),
        isSubscribed: false,
      },
    };
  }

  async getUser() {
    // 1. 获取订阅状态
    // 2. 获取用户信息
    // 3. 发送响应

    let isSubscribed = false;
    if (this.ctx.user) {
      const record = await this.app.model.Subscription.findOne({
        user: this.ctx.user._id,
        channel: this.ctx.params.userId,
      });
      if (record) {
        isSubscribed = true;
      }
    }

    const user = await this.app.model.User.findById(this.ctx.params.userId);
    this.ctx.body = {
      user: {
        ...this.ctx.helper._.pick(user.toJSON(), [
          'username',
          'email',
          'avatar',
          'cover',
          'channelDescription',
          'subscribersCount',
        ]),
        isSubscribed,
      },
    };
  }

  async subscriptions() {
    const Subscription = this.app.model.Subscription;
    let subscriptions = await Subscription.find({
      user: this.ctx.params.userId,
    }).populate('channel');
    subscriptions = subscriptions.map(item => {
      return this.ctx.helper._.pick(item.channel, [
        '_id',
        'username',
        'avatar',
      ]);
    });
    this.ctx.body = {
      subscriptions,
    };
  }
}

module.exports = UserController;
