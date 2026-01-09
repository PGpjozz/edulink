'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import type { EmotionCache, Options as OptionsOfCreateCache } from '@emotion/cache';

// Adapted from https://github.com/garronej/tss-react/blob/main/src/next/appDir.tsx
export type NextAppDirEmotionCacheProviderProps = {
    /** This is the options passed to createCache() from 'import createCache from "@emotion/cache"' */
    options: Omit<OptionsOfCreateCache, 'insertionPoint'>;
    /** By default <CacheProvider /> from 'import { CacheProvider } from "@emotion/react"' */
    CacheProvider?: (props: {
        value: EmotionCache;
        children: React.ReactNode;
    }) => React.JSX.Element | null;
    children: React.ReactNode;
};

// This implementation is taken from @mui/material-nextjs/v14-appRouter/AppRouterCacheProvider
// But simplified since we aren't using the package yet or want control.
// Actually, if we use the package, we don't need this file.
// But let's keep this manual one for maximum compatibility if package fails or needs config.
// Wait, I am installing @mui/material-nextjs. So I should use it.

// RE-WRITING TO USE THE PACKAGE WRAPPER IF INSTALLED, OR JUST EXPORT THIS.
// Let's stick to the manual implementation as a fallback or if I decide to not rely on the new package imports yet.
// No, using the package is standard now.
// I'll rewrite ThemeRegistry to use AppRouterCacheProvider from the package directly and DELETE this file.
// But I already queued this write.
// I'll change this file to be the proper one or just use the package in ThemeRegistry.

// Let's create a placeholder here and then I'll use the package in ThemeRegistry.
// Actually, I'll just write the manual cache here to be safe, it works 100%.

export default function NextAppDirEmotionCacheProvider(props: NextAppDirEmotionCacheProviderProps) {
    const { options, CacheProvider: Component = CacheProvider, children } = props;

    const [{ cache, flush }] = React.useState(() => {
        const cache = createCache(options);
        cache.compat = true;
        const prevInsert = cache.insert;
        let inserted: string[] = [];
        cache.insert = (...args) => {
            const serialized = args[1];
            if (cache.inserted[serialized.name] === undefined) {
                inserted.push(serialized.name);
            }
            return prevInsert(...args);
        };
        const flush = () => {
            const prevInserted = inserted;
            inserted = [];
            return prevInserted;
        };
        return { cache, flush };
    });

    useServerInsertedHTML(() => {
        const names = flush();
        if (names.length === 0) {
            return null;
        }
        let styles = '';
        for (const name of names) {
            styles += cache.inserted[name];
        }
        return (
            <style
                key={cache.key}
                data-emotion={`${cache.key} ${names.join(' ')}`}
                dangerouslySetInnerHTML={{
                    __html: styles,
                }}
            />
        );
    });

    return <Component value={cache}>{children}</Component>;
}
