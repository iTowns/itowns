import * as THREE from 'three';
import { LRUCache } from 'lru-cache';

/**
 * Manages render target cache with deferred disposal for better memory
 * management. Tracks which render targets are currently in use and
 * disposes those that are no longer needed.
 */
export class RenderTargetCache {
    /**
     * Render targets queued for disposal.
     */
    private _pendingDisposal: Map<string, THREE.WebGLArrayRenderTarget>;

    /**
     * Render targets used in the current render cycle.
     */
    private _usedIds: Set<string>;

    /**
     * LRU cache of render targets, automatically discards least recently
     * used when max is exceeded.
     */
    private _cache: LRUCache<string, THREE.WebGLArrayRenderTarget>;

    constructor(maxCacheSize: number = 200) {
        this._pendingDisposal = new Map();
        this._usedIds = new Set();
        this._cache = new LRUCache({
            max: maxCacheSize,
            dispose: (rt: THREE.WebGLArrayRenderTarget, key: string) => {
                this._pendingDisposal.set(key, rt);
            },
        });
    }

    /**
     * Perform cleanup of render targets that are not used in this render cycle.
     */
    public cleanup(): void {
        // important: only clean up if last loop did rendering
        if (!this._usedIds.size) { return; }

        for (const [id, renderTarget] of this._pendingDisposal) {
            if (this._usedIds.has(id)) {
                continue;
            }
            renderTarget.dispose();
            this._pendingDisposal.delete(id);
        }

        // initialize render target usage tracking for next render
        this._usedIds.clear();
    }

    /**
     * Track usage of a render target in the current render cycle.
     *
     * @param id - The identifier of the render target to track
     */
    public markAsUsed(id: string): void {
        this._usedIds.add(id);
    }

    /**
     * Get a render target from cache or pending disposal.
     *
     * @param id - The identifier of the render target
     * @returns The render target or undefined if not found
     */
    public get(id: string): THREE.WebGLArrayRenderTarget | undefined {
        let rt = this._cache.get(id);

        if (!rt) {
            rt = this._pendingDisposal.get(id);
            if (rt) {
                this._cache.set(id, rt);
                this._pendingDisposal.delete(id);
            }
        }

        return rt;
    }

    /**
     * Add or update a render target in cache.
     *
     * @param id - The identifier of the render target
     * @param rt - The render target to cache
     */
    public set(id: string, rt: THREE.WebGLArrayRenderTarget): void {
        this._cache.set(id, rt);
    }

    /**
     * Dispose all render targets and clear the cache completely.
     */
    public dispose(): void {
        for (const [, renderTarget] of this._cache) {
            renderTarget.dispose();
        }
        this._cache.clear();

        for (const [, renderTarget] of this._pendingDisposal) {
            renderTarget.dispose();
        }
        this._pendingDisposal.clear();

        this._usedIds.clear();
    }
}
