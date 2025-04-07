const roleAuthorization = require('../roleMiddleware');

describe('Role Authorization Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        username: 'testuser',
        role: 'tech'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next if user has allowed role', () => {
    const middleware = roleAuthorization(['tech', 'admin']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should handle role case insensitively', () => {
    req.user.role = 'TECH';
    const middleware = roleAuthorization(['tech', 'admin']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 if user does not have allowed role', () => {
    const middleware = roleAuthorization(['admin', 'purchasing']);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Forbidden')
      })
    );
  });

  it('should return 401 if no user is attached to the request', () => {
    delete req.user;
    const middleware = roleAuthorization(['admin', 'tech']);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Unauthorized')
      })
    );
  });
}); 