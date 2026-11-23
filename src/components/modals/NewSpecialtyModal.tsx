import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";

import { Button, Input, Modal } from "@/components";
import {
  createSpecialtySchema,
  type CreateSpecialtyFormData,
} from "@/schemas/admin.schema";
import { adminService, type AdminSpecialty } from "@/services/admin.service";
import { getApiErrorMessage, getApiErrorStatus } from "@/services/api";
import { getSpecialtyImage } from "@/utils/specialtyIcons";

export interface NewSpecialtyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (specialty: AdminSpecialty) => void;
}

type LoadStatus = "loading" | "ready" | "error";

const byName = (a: AdminSpecialty, b: AdminSpecialty) =>
  a.name.localeCompare(b.name, "pt-BR");

// Modal administrativo para listar e cadastrar novas especialidades medicas.
export function NewSpecialtyModal({
  open,
  onClose,
  onCreated,
}: NewSpecialtyModalProps) {
  const [items, setItems] = useState<AdminSpecialty[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateSpecialtyFormData>({
    resolver: zodResolver(createSpecialtySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: "", description: "" });
    clearErrors();
    setJustAddedId(null);
  }, [open, reset, clearErrors]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus((current) => (current === "ready" ? "ready" : "loading"));

    adminService
      .listSpecialties()
      .then((fresh) => {
        if (cancelled) return;
        setItems((current) =>
          [
            ...fresh,
            ...current.filter((c) => !fresh.some((f) => f.id === c.id)),
          ].sort(byName)
        );
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus((current) => (current === "ready" ? "ready" : "error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const onSubmit = async (data: CreateSpecialtyFormData) => {
    clearErrors("root");
    try {
      const created = await adminService.createSpecialty({
        name: data.name.trim(),
        description: data.description.trim() || undefined,
      });
      setItems((current) =>
        [...current.filter((s) => s.id !== created.id), created].sort(byName)
      );
      setStatus("ready");
      setJustAddedId(created.id);
      reset({ name: "", description: "" });
      onCreated(created);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Não foi possível criar a especialidade."
      );
      if (getApiErrorStatus(err) === 409) {
        setError("name", { message });
      } else {
        setError("root", { message });
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Especialidades"
      closeLabel="Fechar modal de especialidades"
    >
      <ScrollView
        className="max-h-[500px]"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 pb-2"
      >
        <View className="gap-2">
          <Text className="text-sm font-bold text-[#004959]">
            Cadastradas{status === "ready" ? ` (${items.length})` : ""}
          </Text>

          {status === "loading" ? (
            <View className="min-h-[80px] items-center justify-center gap-2 rounded-2xl border border-[#e6ecee] bg-[#f6f8f9] p-4">
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-xs text-[#6b7280]">
                Carregando especialidades...
              </Text>
            </View>
          ) : null}

          {status === "error" ? (
            <View className="gap-3 rounded-2xl border border-[#e6ecee] bg-[#f6f8f9] p-4">
              <Text className="text-sm text-[#004959]">
                Não foi possível carregar as especialidades.
              </Text>
              <Button
                label="Tentar novamente"
                variant="outline"
                onPress={() => setReloadKey((k) => k + 1)}
              />
            </View>
          ) : null}

          {status === "ready" && items.length === 0 ? (
            <View className="rounded-2xl border border-[#e5b12c] bg-[#F7C343] p-4">
              <Text className="text-sm font-semibold text-[#004959]">
                Nenhuma especialidade cadastrada ainda. Adicione a primeira
                abaixo.
              </Text>
            </View>
          ) : null}

          {status === "ready" && items.length > 0 ? (
            <View className="gap-2">
              {items.map((specialty) => (
                <View
                  key={specialty.id}
                  className="flex-row items-center justify-between gap-3 rounded-2xl border border-[#e6ecee] bg-white px-4 py-3"
                >
                  <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f8f9]">
                    <Image
                      source={getSpecialtyImage(specialty.name)}
                      resizeMode="contain"
                      style={{ width: 28, height: 28 }}
                    />
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-[#004959]">
                      {specialty.name}
                    </Text>
                    {specialty.description ? (
                      <Text className="mt-0.5 text-xs text-[#6b7280]">
                        {specialty.description}
                      </Text>
                    ) : null}
                  </View>

                  {specialty.id === justAddedId ? (
                    <View className="rounded-full bg-[#dbf0ef] px-2.5 py-1">
                      <Text className="text-xs font-bold text-[#004959]">
                        Nova
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="gap-4 border-t border-[#e6ecee] pt-4">
          <Text className="text-sm font-bold text-[#004959]">
            Adicionar nova
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome"
                value={value}
                onChangeText={(text) => {
                  if (errors.root) clearErrors("root");
                  onChange(text);
                }}
                onBlur={onBlur}
                placeholder="Ex.: Ortopedia"
                autoCapitalize="sentences"
                editable={!isSubmitting}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descrição (opcional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ex.: Ossos, músculos e articulações"
                autoCapitalize="sentences"
                editable={!isSubmitting}
                error={errors.description?.message}
              />
            )}
          />

          {errors.root?.message ? (
            <View className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
              <Text
                accessibilityRole="alert"
                className="text-center text-sm font-medium text-danger"
              >
                {errors.root.message}
              </Text>
            </View>
          ) : null}

          <View className="gap-2.5">
            <Button
              label={isSubmitting ? "Adicionando..." : "Adicionar"}
              loading={isSubmitting}
              onPress={() => {
                void handleSubmit(onSubmit)();
              }}
            />
            <Button
              label="Fechar"
              variant="outline"
              disabled={isSubmitting}
              onPress={onClose}
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
