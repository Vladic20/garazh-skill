// Honour HTTP(S)_PROXY / NO_PROXY for Node's fetch (corporate networks, sandboxes). Node's built-in fetch ignores them.
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) setGlobalDispatcher(new EnvHttpProxyAgent());
