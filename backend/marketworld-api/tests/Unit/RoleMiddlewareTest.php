<?php

namespace Tests\Unit;

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    public function test_handle_returns_401_when_no_user()
    {
        $mw = new RoleMiddleware();
        $request = Request::create('/');

        $resp = $mw->handle($request, function () {
            return response('ok');
        }, 'Administrador');

        $this->assertEquals(401, $resp->getStatusCode());
    }

    public function test_handle_returns_403_when_user_has_no_role()
    {
        $mw = new RoleMiddleware();
        $request = Request::create('/');

        $user = new class {
            public function hasAnyRole($roles)
            {
                return false;
            }
        };

        $request->setUserResolver(fn() => $user);

        $resp = $mw->handle($request, function () {
            return response('ok');
        }, 'Administrador');

        $this->assertEquals(403, $resp->getStatusCode());
    }

    public function test_handle_allows_when_user_has_role()
    {
        $mw = new RoleMiddleware();
        $request = Request::create('/');

        $user = new class {
            public function hasAnyRole($roles)
            {
                return true;
            }
        };

        $request->setUserResolver(fn() => $user);

        $resp = $mw->handle($request, function () {
            return response('ok');
        }, 'Administrador');

        $this->assertEquals(200, $resp->getStatusCode());
    }
}
