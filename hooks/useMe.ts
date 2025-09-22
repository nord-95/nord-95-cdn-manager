import useSWR from 'swr';
import { User } from '@/lib/auth';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMe() {
  const { data, error, mutate } = useSWR<User>('/api/auth/me', fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
